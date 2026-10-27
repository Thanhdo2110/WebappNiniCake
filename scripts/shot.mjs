/* Chụp màn hình + bắt lỗi console của Chrome thật (headless, CDP qua WebSocket có sẵn trong Node)
   Dùng: node scripts/shot.mjs            -> trang khách + trang quản trị (đăng nhập admin qua CDP)
          NO_ADMIN=1 node scripts/shot.mjs -> chỉ trang khách
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const OUT = path.resolve('scripts/shots');
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--hide-scrollbars', '--window-size=1440,2200', 'about:blank',
], { stdio: 'ignore' });

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
const logs = [];
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error(JSON.stringify(m.error)));
    else p.resolve(m.result);
  }
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
    const text = m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
    if (text.includes('React Router Future Flag Warning')) return; // cảnh báo upgrade flag, không phải lỗi trang
    logs.push(`[console.${m.params.type}] ` + text);
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') logs.push(`[${m.params.entry.source}] ${m.params.entry.text}`);
  if (m.method === 'Network.loadingFailed') logs.push(`[netfail] ${m.params.errorText} (type=${m.params.type})`);
};

await send('Network.enable');
await send('Runtime.enable');
await send('Page.enable');

async function evalJs(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'JS lỗi');
  return r.result.value;
}

const pages = [
  ['home', 'http://localhost:5173/'],
  ['products', 'http://localhost:5173/banh'],
  ['detail', `http://localhost:5173/san-pham/${process.env.DETAIL_SLUG || 'banh-kem-socola-den-valrhona'}`],
  ['cart', 'http://localhost:5173/gio-hang'],
  ['about', 'http://localhost:5173/ve-nini'],
  ['contact', 'http://localhost:5173/lien-he'],
  ['faq', 'http://localhost:5173/cau-hoi'],
  ['policies', 'http://localhost:5173/chinh-sach'],
  ['login', 'http://localhost:5173/dang-nhap'],
  ['checkout', 'http://localhost:5173/thanh-toan'],
];

const only = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null;
const pick = (arr) => (only ? arr.filter(([n]) => only.some((o) => n === o || n.endsWith(o))) : arr);

const report = [];
for (const [name, url] of pick(pages)) {
  logs.length = 0;
  await send('Page.navigate', { url });
  await wait(3000);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'), 'base64');
  const info = await evalJs('JSON.stringify({t:document.title,h1:(document.querySelector("h1")||{}).innerText,b:document.body.innerText.length})');
  report.push(`${name} -> ${file} | ${info} | lỗi: ${logs.length ? logs.slice(0, 3).join(" ;; ").slice(0, 240) : "KHÔNG"}`);
}

const wantMember = !only || only.some((o) => o.startsWith('m-'));
if (!process.env.NO_ADMIN && wantMember) {
  /* Trang cần đăng nhập khách: /tai-khoan/*, /thanh-toan */
  await send('Page.navigate', { url: 'http://localhost:5173/dang-nhap' });
  await wait(2200);
  const custLogin = await evalJs(`(async () => {
    const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vy.nguyen@example.com', password: 'Customer@123' }) });
    const j = await r.json();
    if (!j?.data?.accessToken) return 'FAIL ' + JSON.stringify(j).slice(0, 160);
    localStorage.setItem('nc_access_token', j.data.accessToken);
    return 'OK ' + j.data.user.role;
  })()`, true);
  report.push('customer-login -> ' + custLogin);

  const memberPages = [
    ['m-cart', 'http://localhost:5173/gio-hang'],
    ['m-checkout', 'http://localhost:5173/thanh-toan'],
    ['m-profile', 'http://localhost:5173/tai-khoan'],
    ['m-addresses', 'http://localhost:5173/tai-khoan/dia-chi'],
    ['m-orders', 'http://localhost:5173/tai-khoan/don-hang'],
    ['m-wishlist', 'http://localhost:5173/tai-khoan/yeu-thich'],
    ['m-reviews', 'http://localhost:5173/tai-khoan/danh-gia'],
  ];
  for (const [name, url] of pick(memberPages)) {
    logs.length = 0;
    await send('Page.navigate', { url });
    await wait(2800);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'), 'base64');
    const info = await evalJs('JSON.stringify({t:document.title,h1:(document.querySelector("h1")||{}).innerText,b:document.body.innerText.length})');
    report.push(`${name} -> ${file} | ${info} | lỗi: ${logs.length ? logs.slice(0, 3).join(" ;; ").slice(0, 240) : "KHÔNG"}`);
  }
}

const wantAdmin = !only || only.some((o) => o.startsWith('admin-'));
if (!process.env.NO_ADMIN && wantAdmin) {
  /* Đăng nhập admin ngay trong trang 5174: gọi API qua Vite proxy rồi ghi localStorage */
  await send('Page.navigate', { url: 'http://localhost:5174/login' });
  await wait(2500);
  const loginResult = await evalJs(`(async () => {
    const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ninicakes.vn', password: 'Admin@123' }) });
    const j = await r.json();
    if (!j?.data?.accessToken) return 'FAIL ' + JSON.stringify(j).slice(0, 160);
    localStorage.setItem('nc_admin_token', j.data.accessToken);
    localStorage.setItem('nc_admin_user', JSON.stringify(j.data.user));
    return 'OK ' + j.data.user.role;
  })()`, true);
  report.push('admin-login -> ' + loginResult);

  const firstOrder = await evalJs(`(async () => {
    const t = localStorage.getItem('nc_admin_token');
    const r = await fetch('/api/v1/admin/orders?page=1&limit=1', { headers: { Authorization: 'Bearer ' + t } });
    const j = await r.json();
    const d = j?.data ?? {};
    const items = d.items ?? d.orders ?? d.rows ?? (Array.isArray(d) ? d : []);
    return items[0]?.id ?? 'NONE';
  })()`, true);

  const firstProductId = await evalJs(`(async () => {
    const t = localStorage.getItem('nc_admin_token');
    const r = await fetch('/api/v1/admin/products?page=1&limit=1', { headers: { Authorization: 'Bearer ' + t } });
    const j = await r.json();
    const d = j?.data ?? {};
    const items = d.items ?? d.products ?? (Array.isArray(d) ? d : []);
    return items[0]?.id ?? 'NONE';
  })()`, true);

  const adminPages = [
    ['admin-dashboard', 'http://localhost:5174/'],
    ['admin-orders', 'http://localhost:5174/orders'],
    ...(firstOrder !== 'NONE' ? [['admin-order-detail', `http://localhost:5174/orders/${firstOrder}`]] : []),
    ['admin-products', 'http://localhost:5174/products'],
    ['admin-product-edit', `http://localhost:5174/products/${firstProductId}`],
    ['admin-categories', 'http://localhost:5174/categories'],
    ['admin-ingredients', 'http://localhost:5174/ingredients'],
    ['admin-coupons', 'http://localhost:5174/coupons'],
    ['admin-reviews', 'http://localhost:5174/reviews'],
    ['admin-customers', 'http://localhost:5174/customers'],
    ['admin-banners', 'http://localhost:5174/banners'],
    ['admin-posts', 'http://localhost:5174/posts'],
    ['admin-messages', 'http://localhost:5174/messages'],
    ['admin-reports', 'http://localhost:5174/reports'],
    ['admin-staff', 'http://localhost:5174/staff'],
    ['admin-settings', 'http://localhost:5174/settings'],
  ];
  for (const [name, url] of pick(adminPages)) {
    logs.length = 0;
    await send('Page.navigate', { url });
    await wait(2600);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'), 'base64');
    const info = await evalJs('JSON.stringify({t:document.title,h1:(document.querySelector("h1")||{}).innerText,b:document.body.innerText.length})');
    report.push(`${name} -> ${file} | ${info} | lỗi: ${logs.length ? logs.slice(0, 3).join(" ;; ").slice(0, 240) : "KHÔNG"}`);
  }
}

console.info(report.join('\n'));
chrome.kill();
process.exit(0);
