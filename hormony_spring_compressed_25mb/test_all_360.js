const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const pages = [
  'index.html',
  'contact.html',
  'services.html',
  'home-2.html',
  'about.html',
  'practitioners.html',
  'blog.html',
  'booking.html',
  'service-detail.html',
  'practitioner-detail.html',
  'blog-detail.html',
  'faq.html',
  'privacy.html',
  'terms.html'
];

async function run() {
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + __dirname + '/temp_profile_360',
    '--window-size=360,740'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  for (const page of pages) {
    await testPage(page);
  }

  chrome.kill();
}

function testPage(page) {
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 9222,
      path: '/json/new?' + encodeURIComponent('file:///' + __dirname.replace(/\\/g, '/') + '/' + page),
      method: 'PUT'
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', async () => {
        try {
          const target = JSON.parse(data);
          const ws = new WebSocket(target.webSocketDebuggerUrl);
          let msgId = 1;
          const send = (method, params = {}) => new Promise((resVal) => {
            const id = msgId++;
            const handler = (event) => {
              const resp = JSON.parse(event.data);
              if (resp.id === id) {
                ws.removeEventListener('message', handler);
                resVal(resp.result);
              }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
          });

          ws.addEventListener('open', async () => {
            await send('Emulation.setDeviceMetricsOverride', {
              width: 360,
              height: 740,
              deviceScaleFactor: 1,
              mobile: true
            });

            await new Promise(r => setTimeout(r, 600));

            const evalRes = await send('Runtime.evaluate', {
              expression: `(() => {
                const docScrollW = document.documentElement.scrollWidth;
                const bodyScrollW = document.body.scrollWidth;
                const winW = window.innerWidth;
                
                // Find any elements overflowing 360px
                const overflowingElements = [];
                document.querySelectorAll('*').forEach(el => {
                  const r = el.getBoundingClientRect();
                  if (r.right > 360.5) {
                    overflowingElements.push({
                      tag: el.tagName,
                      class: el.className,
                      id: el.id,
                      right: Math.round(r.right),
                      width: Math.round(r.width)
                    });
                  }
                });

                // Find any CTA button containers where buttons overflow or wrap poorly
                const ctaIssues = [];
                document.querySelectorAll('.service-card-actions, .practitioner-actions, .hero-cta-group, .cta-banner-actions, .btn-group').forEach(cta => {
                  const ctaR = cta.getBoundingClientRect();
                  const buttons = Array.from(cta.querySelectorAll('.btn, button, a'));
                  buttons.forEach(btn => {
                    const btnR = btn.getBoundingClientRect();
                    if (btnR.right > ctaR.right + 1 || btnR.left < ctaR.left - 1 || btnR.right > 360) {
                      ctaIssues.push({
                        ctaClass: cta.className,
                        btnText: btn.innerText.trim(),
                        btnWidth: Math.round(btnR.width),
                        ctaWidth: Math.round(ctaR.width),
                        btnRight: Math.round(btnR.right),
                        ctaRight: Math.round(ctaR.right)
                      });
                    }
                  });
                });

                // Check container padding
                const containers = Array.from(document.querySelectorAll('.container')).map(c => {
                  const style = window.getComputedStyle(c);
                  const r = c.getBoundingClientRect();
                  return {
                    class: c.className,
                    padLeft: style.paddingLeft,
                    padRight: style.paddingRight,
                    width: Math.round(r.width),
                    left: Math.round(r.left),
                    right: Math.round(r.right)
                  };
                });

                return {
                  page: '${page}',
                  winW,
                  docScrollW,
                  bodyScrollW,
                  hasHScroll: docScrollW > 360 || bodyScrollW > 360,
                  overflowCount: overflowingElements.length,
                  topOverflows: overflowingElements.slice(0, 8),
                  ctaIssues,
                  sampleContainer: containers[0]
                };
              })()`,
              returnByValue: true
            });

            console.log('=== ' + page + ' ===');
            console.log(JSON.stringify(evalRes.result.value, null, 2));

            await send('Target.closeTarget', { targetId: target.id });
            ws.close();
            resolve();
          });
        } catch (e) {
          console.error(page, e);
          resolve();
        }
      });
    });
    req.end();
  });
}

run();
