const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // If root, serve index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  let filePath = path.join(process.cwd(), pathname);

  // Check if direct file exists
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Vercel cleanUrls check: try pathname + .html
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else {
      // 404
      const custom404 = path.join(process.cwd(), '404.html');
      if (fs.existsSync(custom404)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(custom404));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 NOT_FOUND');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Local production preview server listening on http://127.0.0.1:3000');
});

// Self-test client
setTimeout(async () => {
  const routes = [
    '/',
    '/index.html',
    '/about',
    '/about.html',
    '/services',
    '/services.html',
    '/contact',
    '/contact.html',
    '/booking',
    '/dashboard',
    '/faq',
    '/blog',
    '/home-2',
    '/assets/css/style.css',
    '/assets/js/app.js',
    '/assets/images/hero_acupuncture.jpg',
    '/non-existent-page'
  ];

  let passed = 0;
  let failed = 0;

  for (const r of routes) {
    await new Promise(resolve => {
      http.get(`http://127.0.0.1:3000${r}`, res => {
        let size = 0;
        res.on('data', c => size += c.length);
        res.on('end', () => {
          const expectedStatus = r === '/non-existent-page' ? 404 : 200;
          const ok = res.statusCode === expectedStatus;
          if (ok) passed++; else failed++;
          console.log(`[${ok ? 'PASS' : 'FAIL'}] ${r.padEnd(35)} -> HTTP ${res.statusCode} (${size} bytes)`);
          resolve();
        });
      }).on('error', err => {
        failed++;
        console.error(`[ERROR] ${r} -> ${err.message}`);
        resolve();
      });
    });
  }

  console.log(`\nLocal preview test results: ${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}, 500);

