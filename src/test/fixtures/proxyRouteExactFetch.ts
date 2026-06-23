export const proxyRouteExactFetch = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("data.csv")
        .then(function(r) { return r.text(); })
        .then(console.log);`,
};
