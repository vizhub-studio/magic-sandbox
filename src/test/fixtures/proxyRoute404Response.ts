export const proxyRoute404Response = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `fetch("unknown.csv")
        .then(function(r) { console.log(r.status); });`,
};
