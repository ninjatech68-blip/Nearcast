const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'web');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

/**
 * Expo's static export writes a dynamic route as `cast/[id].html`, and a
 * real host rewrites /cast/anything onto it. Do the same here, or every
 * detail screen 404s and the capture silently records a not-found page.
 */
function resolve(p) {
  const f = path.join(ROOT, p);
  if (fs.existsSync(f) && !fs.statSync(f).isDirectory()) return f;
  if (fs.existsSync(f + '.html')) return f + '.html';
  const dir = path.dirname(f);
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    const dyn = fs.readdirSync(dir).find((x) => /^\[.+\]\.html$/.test(x));
    if (dyn) return path.join(dir, dyn);
  }
  return null;
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = resolve(p);
  if (!f) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(8099, () => console.log('serving on 8099'));
