const { spawn } = require('child_process');
const http = require('http');

async function checkOverflows() {
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + __dirname + '/temp_profile_find_of',
    '--window-size=360,740'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  for (const page of ['contact.html', 'index.html', 'home-2.html', 'services.html', 'about.html']) {
    await new Promise((resolve) => {
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

              await new Promise(r => setTimeout(r, 800));

              const res = await send('Runtime.evaluate', {
                expression: `(() => {
                  const bad = [];
                  document.querySelectorAll('*').forEach(el => {
                    if (el.closest('.mobile-nav-drawer')) return;
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') return;
                    const r = el.getBoundingClientRect();
                    // element right exceeds 360
                    if (r.right > 360.5) {
                      bad.push({
                        tag: el.tagName,
                        className: (el.className || '').toString().slice(0, 50),
                        id: el.id,
                        right: Math.round(r.right),
                        width: Math.round(r.width),
                        scrollWidth: el.scrollWidth,
                        text: (el.innerText || '').slice(0, 40).replace(/\\n/g, ' ')
                      });
                    }
                  });
                  return {
                    page: '${page}',
                    bodyScrollWidth: document.body.scrollWidth,
                    docScrollWidth: document.documentElement.scrollWidth,
                    overflowingElements: bad
                  };
                })()`,
                returnByValue: true
              });

              console.log('=== ' + page + ' ===');
              console.log(JSON.stringify(res.result.value, null, 2));

              await send('Target.closeTarget', { targetId: target.id });
              ws.close();
              resolve();
            });
          } catch (e) {
            console.error(e);
            resolve();
          }
        });
      });
      req.end();
    });
  }

  chrome.kill();
}

checkOverflows();
