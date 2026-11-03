import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = resolve(root, 'dist-web');
if (!existsSync(resolve(directory, 'index.html'))) {
  const build = spawnSync(process.execPath, [resolve(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'dist-web'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Invalid path'); return; }
  let path = resolve(directory, '.' + pathname);
  if (path !== directory && !path.startsWith(directory + sep)) { response.writeHead(403).end('Forbidden'); return; }
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, 'index.html');
  if (!existsSync(path)) {
    if (!extname(pathname)) path = resolve(directory, 'index.html');
    else { response.writeHead(404).end('Not found'); return; }
  }
  response.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
  if (request.method === 'HEAD') { response.end(); return; }
  createReadStream(path).on('error', () => response.destroy()).pipe(response);
});
server.on('error', error => { console.error(error.message); process.exit(1); });
server.listen(8081, '127.0.0.1', () => console.log('Rositrus POS is running at http://localhost:8081\nKeep this process running while you use the browser app.'));
