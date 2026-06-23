export const proxyRouteRuntimeInjection = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script>
      window.__magicSandboxProxyRoutes = [{ paths: ["data.csv"] }];
    </script>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("data.csv")
        .then(function(r) { return r.text(); })
        .then(console.log);`,
};
