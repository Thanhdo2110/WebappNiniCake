/* Kiểm thử phía khách: form địa chỉ đã gọn (không còn Phường/xã, Quận/huyện, Tỉnh/thành),
   chỉ còn ô Địa chỉ + GeoPicker, và vẫn đặt đơn được (đi qua API thật).
   Dùng: node scripts/verify-address-form.mjs [baseUrl]  (mặc định http://localhost:8080)
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8080';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;
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

/* Đăng nhập khách demo */
await send('Page.navigate', { url: `${BASE}/` });
await wait(2000);
const login = await evalJs(`(async () => {
  const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vy.nguyen@example.com', password: 'Customer@123' }) });
  const j = await r.json();
  if (!j?.data?.accessToken) return 'FAIL ' + JSON.stringify(j).slice(0, 120);
  localStorage.setItem('nc_access_token', j.data.accessToken);
  return 'OK ' + j.data.user.role;
})()`, true);
report.push('customer-login -> ' + login);

/* 1) Sổ địa chỉ: mở form 새, đếm nhãn cũ còn/không */
await send('Page.navigate', { url: `${BASE}/tai-khoan/dia-chi` });
await wait(2500);
await evalJs(`(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const plus = btns.find((b) => b.textContent.includes('Thêm địa chỉ'));
  if (plus) plus.click();
  return 'ok';
})()`, true);
await wait(800);
const addrForm = await evalJs(`JSON.stringify({
  coPhuong: !!document.querySelector('#ad-ward'),
  coQuan: !!document.querySelector('#ad-district'),
  coTinhThanh: !!document.querySelector('#ad-city'),
  coDiaChi: !!document.querySelector('#ad-line'),
  coDinhVi: !!document.querySelector('.geo-picker'),
})`, true);
report.push('addr-form -> ' + addrForm);
let shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT, 'verify-addr-form.png'), Buffer.from(shot.data, 'base64'), 'base64');

/* Điền form và Lưu — xác nhận vẫn tạo được địa chỉ (city gửi ngầm) */
const saved = await evalJs(`(async () => {
  const set = (sel, v) => {
    const el = document.querySelector(sel);
    if (!el) return 'THIEU ' + sel;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return null;
  };
  const e1 = set('#ad-fullName', 'Test Giao Hàng');
  const e2 = set('#ad-phone', '0905123456');
  const e3 = set('#ad-line', '107 Nguyễn Du, P.Bến Nghé, Quận 1');
  if (e1 || e2 || e3) return 'MISS ' + [e1, e2, e3].filter(Boolean).join(',');
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Thêm mới'));
  if (!btn) return 'THIEU_NUT_LUU';
  btn.click();
  await new Promise((r) => setTimeout(r, 2200));
  const text = document.body.innerText;
  return text.includes('Test Giao Hàng') && text.includes('107 Nguyễn Du') ? 'LƯU_OK' : ('THAT_BAI: ' + text.slice(0, 200));
})()`, true);
report.push('addr-save -> ' + saved);

/* 2) Thanh toán: thêm món vào giỏ rồi mở bước địa chỉ */
await evalJs(`(async () => {
  const prods = await (await fetch('/api/v1/products?limit=1', { headers: { Authorization: 'Bearer ' + localStorage.getItem('nc_access_token') } })).json();
  const slug = prods?.data?.items?.[0]?.slug;
  if (!slug) return 'NO_SLUG';
  const detail = await (await fetch('/api/v1/products/' + slug, { headers: { Authorization: 'Bearer ' + localStorage.getItem('nc_access_token') } })).json();
  const variantId = detail?.data?.variants?.find((v) => v.isActive !== false)?.id ?? detail?.data?.variants?.[0]?.id;
  if (!variantId) return 'NO_VARIANT';
  const add = await fetch('/api/v1/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('nc_access_token') },
    body: JSON.stringify({ variantId, quantity: 1 }) });
  return add.ok ? 'CART_OK' : 'CART_FAIL ' + (await add.text()).slice(0, 100);
})()`, true);
await wait(300);
await send('Page.navigate', { url: `${BASE}/thanh-toan` });
await wait(3000);
await evalJs(`(() => {
  const radios = Array.from(document.querySelectorAll('.addr-card--new input[type=radio]'));
  if (radios.length) { radios[0].click(); return 'clicked-new'; }
  return 'no-addr-new';
})()`, true);
await wait(700);
const checkoutForm = await evalJs(`JSON.stringify({
  coPhuong: !!document.querySelector('#co-ward'),
  coQuan: !!document.querySelector('#co-district'),
  coTinhThanh: !!document.querySelector('#co-city'),
  coDiaChi: !!document.querySelector('#co-line'),
  coDinhVi: !!document.querySelector('.geo-picker'),
})`, true);
report.push('addr-checkout -> ' + checkoutForm);
shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT, 'verify-checkout-addr.png'), Buffer.from(shot.data, 'base64'), 'base64');

console.info(report.join('\n'));
chrome.kill();
process.exit(0);
