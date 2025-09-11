export const fetchProxyBoth = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `
// Test both relative URL patterns
Promise.all([
  fetch("data.csv").then(r => r.text()),
  fetch("./data2.csv").then(r => r.text())
]).then(results => {
  console.log(results.join(" "));
});`,
  "data.csv": `Hello,`,
  "data2.csv": `Both Work!`,
};