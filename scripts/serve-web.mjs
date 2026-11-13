import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'app', 'dist');
const PORT = Number(process.env.WEB_PORT || 4173);
const HOST = process.env.WEB_HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error(`Missing web build at ${DIST_DIR}. Run "npm run build:web" first.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const rawPath = (req.url || '/').split('?')[0];
  const safeRel = path.normalize(rawPath).replace(/^([/\\]|(\.\.[/\\]))+/, '');
  let filePath = path.join(DIST_DIR, safeRel || 'index.html');

  if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`WasteLess AI Web SPA listening on http://127.0.0.1:${PORT} (host ${HOST})`);
});
