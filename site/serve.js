// Tiny static server for local preview:  node serve.js   → http://localhost:5173
const http = require("http"), fs = require("fs"), path = require("path");
const root = __dirname, port = 5173;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  // like GitHub Pages: /careers serves careers.html
  if (!path.extname(p) && fs.existsSync(path.join(root, p + ".html"))) p += ".html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, () => console.log(`Serving on http://localhost:${port}`));
