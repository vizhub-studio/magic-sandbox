import puppeteer, { Browser } from "puppeteer";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { magicSandbox } from "../index";
import { testInBrowser } from "./testInBrowser";
import { testInBrowserWithProxyParent } from "./testInBrowserWithProxyParent";
import {
  basicHTML,
  fetchProxy,
  fetchProxyRelative,
  fetchProxyBoth,
  xhrRelative,
  jsScriptTag,
  jsScriptTagTypeModule,
  styleTest,
  xmlTest,
  protocolTest,
  jsScriptTagWithDollarSigns,
  proxyRouteExactFetch,
  proxyRouteGlobFetch,
  proxyRouteSuffixFetch,
  proxyRouteNoMatchFallback,
  proxyRoute404Response,
  proxyRouteTimeout,
  proxyRouteRuntimeInjection,
  proxyRouteMultipleRoutes,
} from "./fixtures";

let browser: Browser;

beforeAll(async () => {
  browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

afterAll(async () => {
  await browser.close();
});

describe("Magic Sandbox", () => {
  it("should generate srcdoc HTML", () => {
    const srcdoc = magicSandbox(basicHTML);
    expect(srcdoc).toContain("<!DOCTYPE html>");
    expect(srcdoc).toContain("<title>My HTML Document</title>");
    expect(srcdoc).toContain("Hello, World!");
  });

  it("basicHTML", async () => {
    await testInBrowser(browser, basicHTML, "Hello, World!");
  });

  it("jsScriptTag", async () => {
    await testInBrowser(browser, jsScriptTag, "Hello, JS!");
  });

  it("jsScriptTagWithDollarSigns", async () => {
    await testInBrowser(browser, jsScriptTagWithDollarSigns, "11 22");
  });

  it("jsScriptTagTypeModule", async () => {
    await testInBrowser(browser, jsScriptTagTypeModule, "Hello, ES Module!");
  });

  it("fetchProxy", async () => {
    await testInBrowser(browser, fetchProxy, "Hello, Fetch!");
  });

  it("fetchProxyRelative", async () => {
    await testInBrowser(browser, fetchProxyRelative, "Hello, Relative Fetch!");
  });

  it("fetchProxyBoth - both relative URL styles work", async () => {
    await testInBrowser(browser, fetchProxyBoth, "Hello, Both Work!");
  });

  it("xhrRelative - XMLHttpRequest with relative URL", async () => {
    await testInBrowser(browser, xhrRelative, "testRoot");
  });

  it("should handle CSS file loading", async () => {
    await testInBrowser(browser, styleTest, "rgb(255, 0, 0)");
  });

  it("should handle XML file loading", async () => {
    await testInBrowser(browser, xmlTest, "root");
  });

  it("should convert protocol-less URLs to https", () => {
    const srcdoc = magicSandbox(protocolTest);
    expect(srcdoc).toContain('href="https://fonts.googleapis.com');
    expect(srcdoc).toContain('src="https://code.jquery.com');
  });
});

describe("ProxyRoute", () => {
  it("exact path match via fetch", async () => {
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteExactFetch,
      [{ paths: ["data.csv"] }],
      { "data.csv": "Hello, Proxy Exact!" },
      "Hello, Proxy Exact!",
    );
  });

  it("glob path match via fetch", async () => {
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteGlobFetch,
      [{ paths: ["/data/*"] }],
      { "/data/sales.csv": "Hello, Proxy Glob!" },
      "Hello, Proxy Glob!",
    );
  });

  it("suffix pattern match via fetch", async () => {
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteSuffixFetch,
      [{ paths: ["*.csv"] }],
      { "report.csv": "Hello, Proxy Suffix!" },
      "Hello, Proxy Suffix!",
    );
  });

  it("no match falls through to inlined content", async () => {
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteNoMatchFallback,
      [{ paths: ["/data/*"] }],
      { "/data/ignored.csv": "should not reach here" },
      "Hello, Local!",
    );
  });

  it("parent returns 404 error response", async () => {
    await testInBrowserWithProxyParent(
      browser,
      proxyRoute404Response,
      [{ paths: ["unknown.csv"] }],
      { "unknown.csv": null }, // null sentinel → parent sends error
      "404",
    );
  });

  it("parent timeout returns 504", async () => {
    // Use a short timeout (50ms) so the test completes quickly
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteTimeout,
      [{ paths: ["never-responds.csv"] }],
      {}, // parent never responds for this path
      "504",
      50,
    );
  });

  it("runtime route injection via window.__magicSandboxProxyRoutes", async () => {
    // Pass empty proxyRoutes array so the helper omits the option key.
    // The fixture sets __magicSandboxProxyRoutes itself before the fetch.
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteRuntimeInjection,
      [],
      { "data.csv": "Hello, Runtime!" },
      "Hello, Runtime!",
    );
  });

  it("multiple routes use first-match semantics", async () => {
    await testInBrowserWithProxyParent(
      browser,
      proxyRouteMultipleRoutes,
      [{ paths: ["/data/*"] }, { paths: ["*.csv"] }],
      { "/data/report.csv": "Hello, First Match!" },
      "Hello, First Match!",
    );
  });
});
