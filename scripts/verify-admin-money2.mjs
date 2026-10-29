/* Kiểm thử ô tiền ₫ ở trang Khuyến mãi (tạo mã AMOUNT) + Cài đặt tiệm của admin.
   Dùng: node scripts/verify-admin-money2.mjs [baseUrl]  (mặc định http://localhost:8081)
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8081';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const OUT = path.resolve('scripts/shots');
const PROFILE = path.resolve('scripts/.chrome-shot-profile');
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--hide-scrollbars', `--window-size=1440,1200`,
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
await send('Network.enable');
await send('Runtime.enable');
await send('Page.enable');
try { await send('Storage.enable'); } catch { /* ok */ }
await send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' }).catch(() => {});

const evalJs = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'JS lỗi');
  return r.result.value;
};
const report = [];
await send('Page.navigate', { url: `${BASE}/login` });
await wait(2500);
const login = await evalJs(`(async () => {
  const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ninicakes.vn', password: 'Admin@123' }) });
  const j = await r.json();
  if (!j?.data?.accessToken) return 'FAIL ' + JSON.stringify(j).slice(0, 120);
  localStorage.setItem('nc_admin_token', j.data.accessToken);
  localStorage.setItem('nc_admin_user', JSON.stringify(j.data.user));
  return 'OK ' + j.data.user.role;
})()`, true);
report.push('admin-login -> ' + login);

/* Gõ rác '50a0x000y' vào mọi ô .money-input thấy được sau khi mở modal */
const typeIntoAll = `document.querySelectorAll('.money-input input').length`;
await send('Page.navigate', { url: `${BASE}/coupons` });
await wait(2500);
await evalJs(`document.querySelector('button.btn-gold, .btn')?.click(); 'open'`, true);
await wait(700);
/* Chuyển loại mã sang AMOUNT để ô giá trị thành tiền */
await evalJs(`(() => {
  const sel = document.querySelector('.modal select');
  if (!sel) return 'no-select';
  sel.selectedIndex = 1;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return 'amount';
})()`, true);
await wait(400);
const coinFolks = await evalJs(`(async () => {
  const inputs = document.querySelectorAll('.money-input input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const out = [];
  for (const el of inputs) {
    for (const ch of '50000') {
      setter.call(el, el.value + ch);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
    }
    out.push(el.value);
  }
  return JSON.stringify({ soO: inputs.length, giaTri: out });
})()`, true);
report.push('coupons-money -> ' + coinFolks);
let shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT, 'verify-coupons-money.png'), Buffer.from(shot.data, 'base64'), 'base64');

await send('Page.navigate', { url: `${BASE}/settings` });
await wait(2500);
const stMoney = await evalJs(`JSON.stringify({
  soO: ${typeIntoAll},
  phiGiao: document.querySelectorAll('.money-input input')[0]?.value ?? null,
  mienPhiTu: document.querySelectorAll('.money-input input')[1]?.value ?? null,
  donVi: Array.from(document.querySelectorAll('.money-input__unit')).map(u => u.textContent),
})`, true);
report.push('settings-money -> ' + stMoney);
shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT, 'verify-settings-money.png'), Buffer.from(shot.data, 'base64'), 'base64');

console.info(report.join('\n'));
chrome.kill();
process.exit(0);
