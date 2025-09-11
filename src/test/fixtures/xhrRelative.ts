export const xhrRelative = {
  "index.html": `<!DOCTYPE html>
<html>
  <body>
    <script src="index.js"></script>
  </body>
</html>`,
  "index.js": `
const xhr = new XMLHttpRequest();
xhr.open('GET', './data.xml');
xhr.onload = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    const root = xhr.responseXML.documentElement;
    console.log(root.nodeName);
  }
};
xhr.send();`,
  "data.xml": `<?xml version="1.0"?><testRoot>Hello XHR Relative!</testRoot>`,
};
