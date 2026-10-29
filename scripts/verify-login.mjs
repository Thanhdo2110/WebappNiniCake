/* Kiểm thử End-to-End màn Đăng nhập (customer-web) qua Chrome headless + CDP.
   Mở trang thật, gõ SĐT + mật khẩu vào ô nhập thật, bấm nút, chụp màn hình kết quả.
   Dùng: node scripts/verify-login.mjs [baseUrl]  (mặc định http://localhost:8080)
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8080';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const OUT = path.resolve('scripts/shots');
const PROFILE = path.resolve('scripts/.chrome-shot-profile');
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--hide-scrollbars', `--window-size=1440,1100`,
  `--user-data-dir=${PROFILE}`, 'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill(); } catch { /* ok */ } });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* chrome chưa sẵn sàng */ }
    await wait(250);
  }
  throw new Error('Không kết nối được Chrome CDP');
}

const ws = new WebSocket((await targets()).webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
let loadWaiters = [];
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
  if (m.method === 'Page.loadEventFired') { loadWaiters.forEach((f) => f()); loadWaiters = []; }
};
await send('Network.enable');
await send('Runtime.enable');
await send('Page.enable');
/* Xóa mọi cookie/localStorage cũ của origin để test từ đầu (không nhiều lấn cấn đăng nhập trước đó) */
try { await send('Storage.enable'); } catch { /* ok */ }
await send('Storage.clearDataForOrigin', { origin: 'http://localhost:8080', storageTypes: 'all' }).catch(() => {});

const evalJs = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'JS lỗi');
  return r.result.value;
};

/* Điều hướng: đặt URL qua SPA router + reload, chờ react settle (bắt mọi dấu hiệu cũ qua reload thật). */
await send('Page.navigate', { url: `${BASE}/dang-nhap` });
await wait(3500);

const fill = `
(async () => {
  const phoneEl = document.querySelector('#lg-phone');
  const pwEl = document.querySelector('#lg-password');
  if (!phoneEl || !pwEl) return 'THIEU_O_NHAP ' + JSON.stringify({ phone: !!phoneEl, pw: !!pwEl });
  const setVal = (el, v) => {
    const proto = window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  setVal(phoneEl, '0901332201');
  setVal(pwEl, 'Customer@123');
  return 'OK ' + JSON.stringify({ phone: phoneEl.value.length, pw: pwEl.value.length });
})()`;
const filled = await evalJs(fill, true);
console.info('[fill]', filled);

await evalJs(`
  const btn = document.querySelector('form button[type="submit"], form .btn-block');
  btn && btn.click();
  'clicked'`, true);
await wait(3000);

const result = await evalJs(`JSON.stringify({
  pathname: location.pathname,
  token: !!localStorage.getItem('nc_access_token'),
  fieldErrors: Array.from(document.querySelectorAll('.form-error')).map(e => e.textContent.trim()),
  errorBox: (document.querySelector('.error-box') || {}).textContent?.trim() || null,
  toast: (document.querySelector('.toast, [role="status"]') || {}).textContent?.trim() || null,
})`, true);
console.info('[RESULT]', result);

const shot = await send('Page.captureScreenshot', { format: 'png' });
const file = path.join(OUT, 'verify-login.png');
fs.writeFileSync(file, Buffer.from(shot.data, 'base64'), 'base64');
console.info('[shot]', file);
chrome.kill();
process.exit(0);
