import puppeteer, { Browser } from "puppeteer";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { magicSandbox } from "../index";
import { testInBrowser } from "./testInBrowser";
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
} from "./fixtures";

let browser: Browser;

beforeAll(async () => {
  browser = await puppeteer.launch();
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
