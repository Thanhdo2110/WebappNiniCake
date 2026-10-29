/* Chụp trang chủ + trang sản phẩm web khách kiểm tra font/tương phản mới */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8080';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9343;
const PROFILE = path.resolve('scripts/.chrome-shot-font');
const OUT = path.resolve('scripts/shots');
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu',
  `--user-data-dir=${PROFILE}`, 'about:blank', '--window-size=1500,950',
], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill(); } catch { /* ok */ } });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const p = list.find((t) => t.type === 'page');
      if (p?.webSocketDebuggerUrl) return p;
    } catch { /* chưa sẵn sàng */ }
    await wait(250);
  }
  throw new Error('no cdp');
}
const ws = new WebSocket((await targets()).webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error(JSON.stringify(m.error)));
    else p.resolve(m.result);
  }
};
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 2, mobile: false });
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(s.data, 'base64'));
  console.info('shot:', name);
};
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'js err');
  return r.result.value;
};

/* trang chủ: đầu trang */
await send('Page.navigate', { url: `${BASE}/` });
await wait(4500);
await shot('font-home-top.png');

/* service cards */
await evalJs(`document.querySelector('.service-card')?.scrollIntoView({ block: 'center' }); 'ok'`);
await wait(900);
await shot('font-home-services.png');

/* lưới sản phẩm (giá) */
await evalJs(`document.querySelector('.p-card')?.scrollIntoView({ block: 'start' }); 'ok'`);
await wait(900);
await shot('font-home-products.png');

/* trang danh sách sản phẩm */
await send('Page.navigate', { url: `${BASE}/products` });
await wait(4000);
await shot('font-products-page.png');

/* font thực tế đang áp dụng */
const fonts = await evalJs(`(() => {
  const el = document.querySelector('.service-card b');
  const cs = el ? getComputedStyle(el) : null;
  const h = document.querySelector('h2');
  return JSON.stringify({
    serviceTitle: cs ? { family: cs.fontFamily.slice(0, 40), weight: cs.fontWeight, size: cs.fontSize } : null,
    h2: h ? { family: getComputedStyle(h).fontFamily.slice(0, 40), weight: getComputedStyle(h).fontWeight } : null,
  });
})()`);
console.info(fonts);
chrome.kill();
process.exit(0);
