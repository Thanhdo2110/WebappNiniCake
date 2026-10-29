/* Kiểm thử End-to-End trang Thêm bánh của admin: đăng nhập + gõ giá vào ô biến thể,
   xác nhận ô giá tự định dạng 'x.x.xxx' kèm đơn vị ₫. Chụp ảnh kết quả.
   Dùng: node scripts/verify-money-input.mjs [baseUrl]  (mặc định http://localhost:8081)
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8081';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;
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

/* 1. Đăng nhập admin qua API same-origin rồi ghi localStorage */
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

/* 2. Vào trang Thêm bánh, gõ giá vào ô biến thể đầu tiên theo kiểu gõ thật (ký tự liên tiếp) */
await send('Page.navigate', { url: `${BASE}/products/new` });
await wait(2500);
const typePrice = await evalJs(`(async () => {
  const typer = async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return 'THIEU ' + selector;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    for (const ch of text) {
      setter.call(el, el.value + ch);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
    }
    return el.value;
  };
  await typer('input[placeholder="VD: Tiramisu lát dâu câm"]', 'Bánh test tiền tự chấm');
  const catSel = document.querySelector('select');
  if (catSel) {
    if (catSel.options.length > 1) { catSel.selectedIndex = 1; catSel.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  const p1 = await typer('.money-input input', '320000');
  return JSON.stringify({ thanhTienDaGhop: p1 });
})()`, true);
report.push('type-price -> ' + typePrice);

/* 3. Gõ giá thị trường (ô 1) và kiêm tra đơn vị ₫ hiển thị trong ô */
const checkUnits = await evalJs(`JSON.stringify({
  soO: document.querySelectorAll('.money-input').length,
  donVi: Array.from(document.querySelectorAll('.money-input__unit')).map(u => u.textContent),
  giaBienThe: document.querySelector('.money-input input')?.value ?? null,
})`, true);
report.push('check-units -> ' + checkUnits);

/* 4. Gõ chuỗi rác '9a0x0y0z0' để xác minh lọc ký tự + tự chấm nhóm */
const junkType = await evalJs(`(async () => {
  const el = document.querySelector('.money-input input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  el.focus();
  setter.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 120));
  for (const ch of '9a0x0y0z0') {
    setter.call(el, el.value + ch);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
  }
  return el.value;
})()`, true);
report.push('junk-filter -> ' + junkType);

const shot = await send('Page.captureScreenshot', { format: 'png' });
const file = path.join(OUT, 'verify-money-input.png');
fs.writeFileSync(file, Buffer.from(shot.data, 'base64'), 'base64');
report.push('shot -> ' + file);
console.info(report.join('\n'));
chrome.kill();
process.exit(0);
