import type { FileCollection } from "@vizhub/viz-types";
import { fixProtocollessUrls } from "./fixProtocollessUrls.js";
import { generateInterceptorScript } from "./generateInterceptorScript.js";

/**
 * A proxy route tells magic-sandbox to forward matching file requests
 * to the parent window via postMessage instead of serving inlined content.
 * Used for project-level dataset resolution at runtime.
 */
export interface ProxyRoute {
  /** File path patterns that should be proxied (e.g., "/data/*", "data.csv") */
  paths: string[];
}

/**
 * Magic Sandbox
 *
 * Originally created for Blockbuilder by Ian Johnson (@enjalot)
 * Contributors: Geoffery Miller (@georules), Paweł Kowalski (@pavelloz),
 * Erik Hazzard (@erikhazzard), Curran Kelleher (@curran), Micah Stubbs (@micahstubbs)
 *
 * This utility transforms HTML templates and handles file references to create
 * a sandboxed environment that intercepts file requests.
 */

/**
 * Escapes special characters in a string for use in regular expressions
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Transforms HTML and files to create a sandboxed environment
 */
export function magicSandbox(
  files: FileCollection,
  options?: { proxyRoutes?: ProxyRoute[]; proxyTimeoutMs?: number },
): string {
  let template = files["index.html"] || "";
  const { "index.html": _, ...remainingFiles } = files;
  // Fix protocol-less URLs (//example.com) to use HTTPS
  template = fixProtocollessUrls(template);

  // Process files and track which ones need to be handled by XHR/fetch
  const referencedFiles: Record<string, string> = {};

  for (const [filename, fileContent] of Object.entries(remainingFiles)) {
    if (!fileContent) continue;

    // Replace <script src="file.js"> with inline <script>content</script>
    // Preserve any attributes like type="module"
    if (filename.endsWith(".js")) {
      const scriptPattern = new RegExp(
        `<script(.*?)src=["']${escapeRegExp(filename)}["'](.*?)>[\\s\\S]*?<\\/script>`,
        "g",
      );
      if (template.match(scriptPattern)) {
        // Escape dollar signs in the JavaScript content
        const escapedContent = fileContent.replace(/\$/g, "$$$$");
        template = template.replace(
          scriptPattern,
          `<script$1$2>${escapedContent}</script>`,
        );
        continue;
      }
    }

    // Replace <link href="file.css"> with inline <style>content</style>
    if (filename.endsWith(".css")) {
      const linkPattern = new RegExp(
        `<link.*?href=["']${escapeRegExp(filename)}["'].*?>`,
        "g",
      );
      if (template.match(linkPattern)) {
        template = template.replace(
          linkPattern,
          `<style>${fileContent}</style>`,
        );
        continue;
      }
    }

    // Skip HTML files for XHR/fetch interception
    if (!filename.endsWith(".html")) {
      referencedFiles[filename] = fileContent;
    }
  }

  // Encode file references for use in the sandboxed environment
  const fileNames = Object.keys(referencedFiles);
  const filesString = encodeURIComponent(JSON.stringify(referencedFiles));

  // Create the interceptor script
  const interceptorScript = generateInterceptorScript(
    fileNames,
    filesString,
    options?.proxyRoutes,
    options?.proxyTimeoutMs,
  );
  const metaAndScript = `<meta charset="utf-8">${interceptorScript}`;

  // Extract DOCTYPE if present
  let doctype = "";
  const doctypeMatch = template.match(/<!DOCTYPE[^>]*>/i);
  if (doctypeMatch) {
    doctype = doctypeMatch[0];
    // Remove DOCTYPE from the template as we'll add it back at the beginning
    template = template.replace(doctypeMatch[0], "");
  }

  // Insert meta charset and interceptor script in the head
  if (template.includes("<head>")) {
    template = template.replace("<head>", `<head>${metaAndScript}`);
  } else if (template.includes("<html>")) {
    template = template.replace(
      "<html>",
      `<html><head>${metaAndScript}</head>`,
    );
  } else {
    // Fallback for documents without proper HTML structure
    return `${doctype}<html><head>${metaAndScript}</head><body>${template}</body></html>`;
  }

  // Add DOCTYPE back at the beginning
  return `${doctype}${template}`;
}
