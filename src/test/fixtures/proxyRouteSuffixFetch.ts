export const proxyRouteSuffixFetch = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("report.csv")
        .then(function(r) { return r.text(); })
        .then(console.log);`,
};
