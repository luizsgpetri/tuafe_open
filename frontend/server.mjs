/**
 * Minimal static server for the built front-end.
 *
 * The app is a single page application, so any unknown path has to fall back
 * to index.html for client side routing (/qr/:token, /join/:token, ...).
 * Written with the Node standard library only: the runtime image installs no
 * front-end dependencies.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.FRONTEND_PORT || 3000);
const HOST = process.env.FRONTEND_HOST || '0.0.0.0';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const resolveFile = async (urlPath) => {
  // Normalising first keeps "../" out of the resolved path.
  const relativePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(ROOT, relativePath);

  if (!candidate.startsWith(ROOT)) {
    return path.join(ROOT, 'index.html');
  }

  try {
    const stats = await stat(candidate);
    if (stats.isFile()) {
      return candidate;
    }
  } catch {
    // Falls through to the SPA entry point below.
  }

  return path.join(ROOT, 'index.html');
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const file = await resolveFile(pathname === '/' ? '/index.html' : pathname);
  const type = CONTENT_TYPES[path.extname(file)] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': type,
    // Hashed asset names make long caching safe; index.html must not be cached.
    'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000',
  });

  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[frontend] serving ${ROOT} on http://${HOST}:${PORT}`);
});
