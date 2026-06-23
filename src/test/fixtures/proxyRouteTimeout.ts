export const proxyRouteTimeout = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("never-responds.csv")
        .then(function(r) { console.log(r.status); });`,
};
