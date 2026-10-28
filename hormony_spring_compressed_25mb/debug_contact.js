const { spawn } = require('child_process');
const http = require('http');

async function debugContact() {
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + __dirname + '/temp_profile_contact_dbg',
    '--window-size=360,740',
    'file:///' + __dirname.replace(/\\/g, '/') + '/contact.html'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const targets = JSON.parse(data);
      const pageTarget = targets.find(t => t.url.includes('contact.html'));
      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
      let msgId = 1;
      const send = (method, params = {}) => new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const resp = JSON.parse(event.data);
          if (resp.id === id) {
            ws.removeEventListener('message', handler);
            resolve(resp.result);
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

        const res = await send('Runtime.evaluate', {
          expression: `(() => {
            const card = document.querySelectorAll('.dash-card')[1];
            const p = card.parentElement;
            const cardR = card.getBoundingClientRect();
            const parentR = p.getBoundingClientRect();
            const form = document.getElementById('contactInquiryForm');
            const formR = form.getBoundingClientRect();
            const grids = Array.from(form.querySelectorAll('.concept-grid')).map(g => {
              const r = g.getBoundingClientRect();
              const style = window.getComputedStyle(g);
              return {
                styleCols: style.gridTemplateColumns,
                gap: style.gap,
                width: r.width,
                right: r.right
              };
            });
            return {
              cardR,
              parentR,
              cardStyle: {
                padding: window.getComputedStyle(card).padding,
                width: window.getComputedStyle(card).width,
                boxSizing: window.getComputedStyle(card).boxSizing
              },
              grids
            };
          })()`,
          returnByValue: true
        });

        console.log('Contact Debug:', JSON.stringify(res.result.value, null, 2));

        ws.close();
        chrome.kill();
      });
    });
  });
}

debugContact();
