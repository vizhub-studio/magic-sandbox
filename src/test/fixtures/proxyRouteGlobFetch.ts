export const proxyRouteGlobFetch = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("/data/sales.csv")
        .then(function(r) { return r.text(); })
        .then(console.log);`,
};
