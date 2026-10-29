/* Verify MoneyInput bằng PHÍM THẬT + IME THẬT qua CDP (không dùng setter giả):
   A. Gõ '320000' từng phím thật (Input.dispatchKeyEvent): DOM phải hiện dạng chấm NGAY sau mỗi phím + caret cuối
   B. Không giới hạn số: gõ tới 12 chữ số không bị cắt (bản cũ .slice(0,9))
   C. Blur -> focus: giữ nguyên dạng chấm
   D. Sửa giữa chuỗi: ArrowLeft + gõ '9' -> chuỗi + caret đúng
   E. IME thật: Input.imeSetComposition('9') -> ô hiện nguyên văn '9' (không mất phím);
      Input.insertText commit composition (compositionend thật) -> '9'; gõ tiếp '2000' -> '92.000'
   F. IME nhiều ký tự: composition '32' -> commit -> '32'; gõ '000' -> '32.000'
   G. Trang /products/new: ô "Giá bán" variant gõ thật + IME như trên
   Dùng: node scripts/verify-money-ime.mjs [baseUrl]
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8081';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9341;
const PROFILE = path.resolve('scripts/.chrome-verify-ime');
const OUT = path.resolve('scripts/shots');
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu',
  `--user-data-dir=${PROFILE}`, 'about:blank',
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
    if (m.error) p.reject(new Error(method0(m.method) + ' ' + JSON.stringify(m.error)));
    else p.resolve(m.result);
  }
};
const method0 = (m) => m ?? '?';
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
// Chrome headless không có focus cửa sổ thật -> phải bật giả lập focus,
// nếu không sự kiện focus/blur và IME không hoạt động như trình duyệt thường.
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.exception?.description ?? 'js err');
  return r.result.value;
};

/* --- gõ 1 ký tự bằng phím thật --- */
const VK = { '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57 };
const typeChar = async (ch) => {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: ch, code: `Digit${ch}`, windowsVirtualKeyCode: VK[ch],
    nativeVirtualKeyCode: VK[ch], text: ch, unmodifiedText: ch, modifiers: 0,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: ch, code: `Digit${ch}`, windowsVirtualKeyCode: VK[ch],
    nativeVirtualKeyCode: VK[ch], modifiers: 0,
  });
};
const keySpecial = async (name, down, modifiers = 0) => {
  const map = {
    Control: { vk: 17, code: 'ControlLeft' },
    Delete: { vk: 46, code: 'Delete' },
    Backspace: { vk: 8, code: 'Backspace' },
    ArrowLeft: { vk: 37, code: 'ArrowLeft' },
  };
  const { vk, code } = map[name];
  await send('Input.dispatchKeyEvent', {
    type: down ? 'keyDown' : 'keyUp', key: name, code,
    windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers,
  });
};
const selectAllDelete = async () => {
  await keySpecial('Control', true, 0);
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65, text: 'a', unmodifiedText: 'a', modifiers: 2,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65, modifiers: 2,
  });
  await keySpecial('Control', false, 0);
  // kiểm tra chọn thật sự; nếu headless không chọn thì chọn bằng JS rồi xoá bằng phím Delete
  const sel = await ev(`(() => { const i = document.activeElement; return i && i.value != null ? i.selectionEnd - i.selectionStart : 0; })()`);
  if (!sel) await ev(`document.activeElement && document.activeElement.select && document.activeElement.select()`);
  await keySpecial('Delete', true);
  await keySpecial('Delete', false);
};
const readState = (idx = 0) => ev(`(() => {
  const inputs = document.querySelectorAll('.money-input input');
  const i = inputs[${idx}];
  if (!i) return JSON.stringify({ missing: true });
  return JSON.stringify({ value: i.value, caret: i.selectionStart, len: i.value.length, active: document.activeElement === i });
})()`);

/* --- đăng nhập --- */
await send('Page.navigate', { url: `${BASE}/login` });
await wait(2500);
await ev(`(async () => {
  const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ninicakes.vn', password: 'Admin@123' }) });
  const j = await r.json();
  localStorage.setItem('nc_admin_token', j.data.accessToken);
  localStorage.setItem('nc_admin_user', JSON.stringify(j.data.user));
  return 'OK';
})()`, true);

await send('Page.navigate', { url: `${BASE}/settings` });
await wait(5000);
await ev(`document.querySelectorAll('.money-input input')[0]?.focus()`);
await wait(200);

const results = {};
const fails = [];

/* A: gõ '320000' phím thật — mỗi phím phải thấy chấm ngay + caret cuối */
{
  await selectAllDelete();
  await wait(150);
  const seqA = [];
  let typed = '';
  for (const ch of '320000') {
    await typeChar(ch);
    typed += ch;
    await wait(90);
    const s = JSON.parse(await readState(0));
    const expect = typed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    seqA.push({ typed, seen: s.value, caret: s.caret, ok: s.value === expect && s.caret === s.value.length });
    if (!(s.value === expect && s.caret === s.value.length)) fails.push(`A gõ '${typed}' thấy '${s.value}' caret=${s.caret} kỳ vọng '${expect}'`);
  }
  const unit = await ev(`document.querySelector('.money-input__unit')?.textContent ?? null`);
  results.A = { tungPhim: seqA, donVi: unit };
}

/* B: không giới hạn số — gõ thêm tới 12 chữ số */
{
  let typed = '320000';
  for (const ch of '789012') {
    await typeChar(ch);
    typed += ch;
    await wait(80);
  }
  const s = JSON.parse(await readState(0));
  const digits = s.value.replace(/\D+/g, '');
  const expect = '320.000.789.012';
  results.B = { seen: s.value, expect, soChuSo: digits.length, ok: s.value === expect && digits.length === 12 };
  if (!results.B.ok) fails.push(`B thấy '${s.value}' (${digits.length} số) kỳ vọng '${expect}'`);
}

/* C: blur -> focus giữ nguyên */
{
  await ev(`document.activeElement && document.activeElement.blur()`);
  await wait(250);
  const sauBlur = JSON.parse(await readState(0)).value;
  await ev(`document.querySelectorAll('.money-input input')[0]?.focus()`);
  await wait(250);
  const sauFocus = JSON.parse(await readState(0)).value;
  results.C = { sauBlur, sauFocus, ok: sauBlur === '320.000.789.012' && sauFocus === '320.000.789.012' };
  if (!results.C.ok) fails.push(`C blur='${sauBlur}' focus='${sauFocus}'`);
}

/* D: sửa giữa chuỗi — ArrowLeft rồi gõ '9' */
{
  await keySpecial('ArrowLeft', true); await keySpecial('ArrowLeft', false);
  await wait(80);
  await typeChar('9');
  await wait(200);
  const s = JSON.parse(await readState(0));
  const expect = '3.200.007.890.192';
  const caretExpect = 16;
  results.D = { seen: s.value, caret: s.caret, expect, caretExpect, ok: s.value === expect && s.caret === caretExpect };
  if (!results.D.ok) fails.push(`D thấy '${s.value}' caret=${s.caret} kỳ vọng '${expect}' caret=${caretExpect}`);
}

/* E: IME thật — composition '9' rồi commit bằng Input.insertText, gõ tiếp '2000' */
{
  await selectAllDelete();
  await wait(150);
  try {
    await send('Input.imeSetComposition', { text: '9', selectionStart: 1, selectionEnd: 1 });
    await wait(200);
    const during = JSON.parse(await readState(0));
    await send('Input.insertText', { text: '9' });
    await wait(250);
    const after = JSON.parse(await readState(0));
    for (const ch of '2000') { await typeChar(ch); await wait(90); }
    const final = JSON.parse(await readState(0));
    results.E = {
      imeAvailable: true,
      khiSoan: during.value,           // phải là '9' nguyên văn — không mất phím
      sauCommit: after.value,
      cuoi: final.value,               // '92.000'
      ok: during.value === '9' && after.value === '9' && final.value === '92.000',
    };
  } catch (e) {
    results.E = { imeAvailable: false, loi: String(e).slice(0, 140) };
    fails.push('E imeSetComposition lỗi: ' + String(e).slice(0, 140));
  }
  if (results.E.imeAvailable && !results.E.ok) fails.push(`E soạn='${results.E.khiSoan}' commit='${results.E.sauCommit}' cuối='${results.E.cuoi}'`);
}

/* F: IME nhiều ký tự '32' -> commit -> gõ '000' */
{
  await selectAllDelete();
  await wait(150);
  try {
    await send('Input.imeSetComposition', { text: '32', selectionStart: 2, selectionEnd: 2 });
    await wait(200);
    const during = JSON.parse(await readState(0));
    await send('Input.insertText', { text: '32' });
    await wait(250);
    const after = JSON.parse(await readState(0));
    for (const ch of '000') { await typeChar(ch); await wait(90); }
    const final = JSON.parse(await readState(0));
    results.F = { khiSoan: during.value, sauCommit: after.value, cuoi: final.value, ok: during.value === '32' && after.value === '32' && final.value === '32.000' };
  } catch (e) {
    results.F = { loi: String(e).slice(0, 140) };
  }
  if (results.F.khiSoan != null && !results.F.ok) fails.push(`F soạn='${results.F.khiSoan}' commit='${results.F.sauCommit}' cuối='${results.F.cuoi}'`);
}

/* H: IME ghép LIÊN TỤC nhiều số chưa commit (đúng tình huống Windows IME tiếng Việt):
   composition '3' -> '32' -> '320' -> '3200' — mỗi bước:
   - ô chính giữ nguyên văn (không ghi đè DOM -> không rơi phím)
   - dòng preview .money-input__preview phải hiện dạng chấm + ₫ THEO TỪNG PHÍM
   rồi commit -> ô chính thành '3.200' */
{
  await selectAllDelete();
  await wait(150);
  try {
    const stepsH = [];
    let acc = '';
    for (const ch of '3200') {
      acc += ch;
      await send('Input.imeSetComposition', { text: acc, selectionStart: acc.length, selectionEnd: acc.length });
      await wait(180);
      const s = JSON.parse(await ev(`(() => {
        const i = document.querySelectorAll('.money-input input')[0];
        const p = i.closest('.money-input')?.querySelector('.money-input__preview')?.textContent ?? null;
        return JSON.stringify({ value: i.value, preview: p });
      })()`));
      const expect = acc.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      stepsH.push({ soan: acc, oChinh: s.value, preview: s.preview, ok: s.preview === expect + ' ₫' });
      if (s.preview !== expect + ' ₫') fails.push(`H soạn '${acc}': preview='${s.preview}' kỳ vọng '${expect} ₫'`);
    }
    await send('Input.insertText', { text: '3200' });
    await wait(250);
    const after = JSON.parse(await readState(0));
    results.H = { tungBuoc: stepsH, sauCommit: after.value, ok: stepsH.every((x) => x.ok) && after.value === '3.200' };
  } catch (e) {
    results.H = { loi: String(e).slice(0, 140) };
    fails.push('H lỗi: ' + String(e).slice(0, 140));
  }
}

/* chụp ảnh trang settings đang có giá trị */
{
  await selectAllDelete();
  await wait(120);
  for (const ch of '320000') { await typeChar(ch); await wait(70); }
  await wait(150);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'verify-settings-realkeys.png'), Buffer.from(shot.data, 'base64'));
}

/* G: trang thêm sản phẩm — ô "Giá bán" variant (money-input thứ 2) */await send('Page.navigate', { url: `${BASE}/products/new` });
await wait(5000);
await ev(`document.querySelectorAll('.money-input input')[1]?.focus()`);
await wait(200);
{
  await selectAllDelete();
  await wait(150);
  const seqG = [];
  let typed = '';
  for (const ch of '320000') {
    await typeChar(ch);
    typed += ch;
    await wait(90);
    const s = JSON.parse(await readState(1));
    const expect = typed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    seqG.push({ typed, seen: s.value, ok: s.value === expect });
    if (s.value !== expect) fails.push(`G(products) gõ '${typed}' thấy '${s.value}' kỳ vọng '${expect}'`);
  }
  results.G = { tungPhim: seqG };
  // IME trên trang sản phẩm
  await selectAllDelete();
  await wait(150);
  try {
    await send('Input.imeSetComposition', { text: '9', selectionStart: 1, selectionEnd: 1 });
    await wait(200);
    const during = JSON.parse(await readState(1));
    await send('Input.insertText', { text: '9' });
    await wait(250);
    for (const ch of '5000') { await typeChar(ch); await wait(90); }
    const final = JSON.parse(await readState(1));
    results.G_ime = { khiSoan: during.value, cuoi: final.value, ok: during.value === '9' && final.value === '95.000' };
    if (!results.G_ime.ok) fails.push(`G-ime soạn='${during.value}' cuối='${final.value}'`);
  } catch (e) {
    results.G_ime = { loi: String(e).slice(0, 140) };
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'verify-products-realkeys.png'), Buffer.from(shot.data, 'base64'));
}

/* logo: admin sidebar + web khách */
await send('Page.navigate', { url: `${BASE}/` });
await wait(2500);
fs.writeFileSync(path.join(OUT, 'verify-admin-logo.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
await send('Page.navigate', { url: 'http://localhost:8080/' });
await wait(3500);
fs.writeFileSync(path.join(OUT, 'verify-home-logo.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

console.info('=== KẾT QUẢ (phím thật + IME thật) ===');
console.info(JSON.stringify(results, null, 1).slice(0, 3200));
console.info(fails.length ? `\n*** THẤT BẠI ${fails.length}:\n- ` + fails.join('\n- ') : '\n*** TẤT CẢ ĐẠT');
chrome.kill();
process.exit(0);
