import { Browser, Page } from "puppeteer";
import { expect } from "vitest";
import { magicSandbox, ProxyRoute } from "../index";
import { FileCollection } from "@vizhub/viz-types";

const DEBUG = false;

export async function testInBrowserWithProxyParent(
  browser: Browser,
  files: FileCollection,
  proxyRoutes: ProxyRoute[],
  responseMap: Record<string, string | null>, // null = respond with error, absent = no response (timeout)
  expectedLog: string,
  timeoutMs?: number,
) {
  const page: Page = await browser.newPage();
  try {
    const logs: string[] = [];
    page.on("console", (message) => logs.push(message.text()));

    // Build magicSandbox options — only include proxyRoutes if non-empty.
    // When proxyRoutes is empty/[], we omit the key so the runtime
    // injection (window.__magicSandboxProxyRoutes) fallback is used.
    const opts: { proxyRoutes?: ProxyRoute[]; proxyTimeoutMs?: number } = {};
    if (proxyRoutes.length > 0) {
      opts.proxyRoutes = proxyRoutes;
    }
    if (timeoutMs !== undefined) {
      opts.proxyTimeoutMs = timeoutMs;
    }
    const sandboxHtml = magicSandbox(
      files,
      Object.keys(opts).length > 0 ? opts : undefined,
    );

    // Build a parent HTML page that hosts the sandbox iframe.
    // Only responds to proxyRequest paths that exist in responseMap.
    // If the value is null, sends an error (404); otherwise sends content.
    // Paths NOT in responseMap get no response (lets timeout fire).
    const parentHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<iframe id="sandbox"></iframe>
<script>
  var responseMap = ${JSON.stringify(responseMap)};
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'proxyRequest') {
      var path = event.data.path;
      if (path in responseMap) {
        var val = responseMap[path];
        if (val === null) {
          event.source.postMessage({
            type: 'proxyResponse',
            requestId: event.data.requestId,
            error: 'not found',
          }, '*');
        } else {
          event.source.postMessage({
            type: 'proxyResponse',
            requestId: event.data.requestId,
            content: val,
          }, '*');
        }
      }
      // If path not in responseMap, do not respond (lets timeout fire)
    }
  });
</script>
</body></html>`;

    DEBUG && console.log("Parent HTML set, about to set srcdoc");
    await page.setContent(parentHtml);

    // Set the iframe srcdoc via evaluate to avoid HTML escaping issues
    await page.evaluate((html) => {
      const iframe = document.getElementById("sandbox");
      if (iframe) {
        iframe.setAttribute("srcdoc", html);
      }
    }, sandboxHtml);

    // Wait for scripts to execute
    await new Promise((resolve) => setTimeout(resolve, 200));

    DEBUG && console.log("Logs:", logs);

    expect(logs).toContain(expectedLog);
  } finally {
    await page.close();
  }
}
