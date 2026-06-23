# magic-sandbox

A powerful library for creating HTML sandboxes that support multiple dynamic files without network requests.

[![npm version](https://img.shields.io/npm/v/magic-sandbox.svg)](https://www.npmjs.com/package/magic-sandbox)

## Overview

The magic-sandbox library allows you to combine multiple HTML, CSS, JavaScript, and data files into a single HTML document that works in any modern browser. It intelligently intercepts network requests to provide a seamless experience for code demonstrations, educational tools, and interactive editors.

Originally extracted from the [Blockbuilder Project](https://github.com/enjalot/blockbuilder) created by Ian Johnson and described in the Medium post [Architecting a Sandbox](https://medium.com/@enjalot/architecting-a-sandbox-97b211937911#.1hz02h1bx).

## Features

- **File Bundling**: Combines multiple files into a single HTML document
- **Request Interception**: Intercepts XMLHttpRequest and fetch calls to load files without network requests
- **Automatic Processing**: Inlines JavaScript and CSS files referenced in HTML
- **Protocol Fix**: Converts protocol-less URLs (//example.com) to HTTPS
- **Multiple File Types**: Supports HTML, CSS, JavaScript, XML, CSV, and other file formats
- **ProxyRoute API**: Forward matching file requests to the parent window via postMessage for runtime dataset resolution

## Installation

```bash
npm install magic-sandbox
```

## Basic Usage

```typescript
import { magicSandbox, FileCollection } from "magic-sandbox";

// Define your files collection
const files: FileCollection = {
  "index.html": `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1>Hello, World!</h1>
    <script src="script.js"></script>
  </body>
</html>`,
  "styles.css": "h1 { color: blue; }",
  "script.js": 'console.log("Hello from JavaScript!");',
  "data.json": '{ "message": "This is data that can be fetched" }',
};

// Generate the HTML
const html = magicSandbox(files);

// Use in an iframe
document.getElementById("sandbox").setAttribute("srcdoc", html);
```

## How It Works

magic-sandbox works by:

1. Starting with your `index.html` file as a template
2. Inlining referenced JavaScript and CSS files when possible
3. Injecting a script that intercepts XMLHttpRequest and fetch calls
4. Encoding the contents of other files for access by the interceptor
5. Fixing protocol-less URLs to use HTTPS

The result is a single HTML document that can reference and load multiple files without making any network requests.

## Advanced Example: Interactive Code Editor

```typescript
import { magicSandbox, FileCollection } from "magic-sandbox";

// When files are updated in your editor
function updatePreview(files: FileCollection) {
  const iframe = document.getElementById("preview");
  const html = magicSandbox(files);
  iframe.setAttribute("srcdoc", html);
}

// Example editor setup
const editor = setupCodeEditor(); // Your editor initialization
editor.onChange((files: FileCollection) => {
  updatePreview(files);
});
```

## ProxyRoute API

magic-sandbox supports **proxy routes** — a mechanism to forward file requests from the sandboxed iframe to the parent window via `postMessage` instead of serving inlined content. This is useful for resolving files at runtime that were not included in the sandbox bundle, such as project-level datasets.

### Interface

```typescript
interface ProxyRoute {
  /** File path patterns that should be proxied (e.g., "/data/*", "data.csv") */
  paths: string[];
}
```

### Usage

Pass `proxyRoutes` in the `options` argument when calling `magicSandbox`:

```typescript
import { magicSandbox, FileCollection, ProxyRoute } from "magic-sandbox";

const routes: ProxyRoute[] = [
  { paths: ["/data/*", "*.csv"] },
  { paths: ["large-dataset.json"] },
];

const files: FileCollection = {
  "index.html": `<html><body><script>fetch('/data/sales.csv').then(r => r.text()).then(console.log)</script></body></html>`,
};

const html = magicSandbox(files, { proxyRoutes: routes });
```

### Pattern Matching

Each path in `paths` supports three matching modes:

| Pattern      | Matches                                                               |
| ------------ | --------------------------------------------------------------------- |
| `"data.csv"` | Exact filename `data.csv`                                             |
| `"/data/*"`  | Any path under `/data/` (e.g., `/data/sales.csv`, `/data/items.json`) |
| `"*.csv"`    | Any file ending with `.csv`                                           |

### Runtime Route Injection

You can also set proxy routes at runtime from inside the sandbox by assigning `window.__magicSandboxProxyRoutes` before any requests are made:

```html
<script>
  window.__magicSandboxProxyRoutes = [{ paths: ["/data/*"] }];
</script>
```

### postMessage Protocol

When a request matches a proxy route, the sandbox sends a `postMessage` to the parent window and awaits a response. The protocol is as follows:

**Sandbox → Parent (`window.parent.postMessage`):**

```typescript
interface ProxyRequest {
  type: "proxyRequest";
  requestId: string; // Unique ID to correlate the response
  path: string; // The normalised file path being requested
}
```

**Parent → Sandbox (`message` event listener):**

The parent must respond with a message of this shape:

```typescript
interface ProxyResponse {
  type: "proxyResponse";
  requestId: string; // Echoes the original requestId
  content?: string; // The file contents (on success)
  error?: string; // Error message (on failure)
}
```

### Parent Window Integration Example

```typescript
// In the parent window (hosting the sandbox iframe)
const iframe = document.getElementById("sandbox");

// Listen for proxy requests from the sandbox
window.addEventListener("message", (event) => {
  if (event.data.type === "proxyRequest") {
    const { requestId, path } = event.data;

    // Resolve the file — e.g., look it up from your own file store
    resolveFileContents(path)
      .then((content) => {
        iframe.contentWindow.postMessage(
          { type: "proxyResponse", requestId, content },
          "*",
        );
      })
      .catch((error) => {
        iframe.contentWindow.postMessage(
          { type: "proxyResponse", requestId, error: error.message },
          "*",
        );
      });
  }
});
```

## Use Cases

- **Code Editors**: Create live-preview code editors like CodePen or JSFiddle
- **Educational Platforms**: Build interactive coding exercises for students
- **Demos & Examples**: Showcase code examples with multiple files
- **Documentation**: Provide runnable code samples in documentation
- **Runtime Dataset Resolution**: Proxy large or dynamically-generated datasets from the parent application to the sandboxed viz

## Browser Compatibility

Works in all modern browsers that support:

- iframes with the srcdoc attribute
- Fetch API
- XMLHttpRequest
- ES6 features
- postMessage API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
