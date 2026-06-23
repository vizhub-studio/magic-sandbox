export const proxyRouteNoMatchFallback = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("local.js")
        .then(function(r) { return r.text(); })
        .then(console.log);`,
  "local.js": "Hello, Local!",
};
