/** Script tạm: duyệt storefront bằng Chrome headless, chụp màn hình + gom lỗi console */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.TEMP + '/nini-shots';
mkdirSync(SHOTS, { recursive: true });

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';

const errors = [];
const log = (...a) => console.log(...a);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,900'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 220)); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 220)));
page.on('requestfailed', (r) => errors.push('[reqfail] ' + r.url().slice(0, 160) + ' :: ' + (r.failure()?.errorText || '')));

const shot = async (name) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); log('  📸', name); };
const settle = async (ms = 1600) => { await new Promise((r) => setTimeout(r, ms)); };

/* ---------- 1. Trang chủ ---------- */
log('1) Trang chủ');
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
await settle(2200);
await shot('01-home');

/* Gợi ý tìm kiếm ở header */
log('2) Gợi ý tìm kiếm header');
await page.click('.head-search__input');
await page.type('.head-search__input', 'socola', { delay: 40 });
await settle(1400);
const suggestCount = await page.$$eval('.suggest__item', (els) => els.length).catch(() => -1);
log('   số gợi ý:', suggestCount);
await shot('02-search-suggest');
await page.keyboard.press('Escape');

/* ---------- 3. Thực đơn ---------- */
log('3) Trang thực đơn');
await page.goto(BASE + '/banh', { waitUntil: 'networkidle2' });
await settle(1800);
const cardCount = await page.$$eval('.p-card', (els) => els.length);
log('   số thẻ bánh:', cardCount);
await shot('03-products');

/* ---------- 4. Chi tiết bánh + thêm vào giỏ (mini cart) ---------- */
log('4) Chi tiết bánh');
const firstHref = await page.$eval('.p-card__name a', (a) => a.getAttribute('href'));
await page.goto(BASE + firstHref, { waitUntil: 'networkidle2' });
await settle(1800);
await shot('04-product-detail');

/* Mở lightbox */
log('5) Lightbox ảnh');
await page.click('.detail-gallery__open');
await settle(900);
await shot('05-lightbox');
await page.keyboard.press('Escape');
await settle(500);

/* Thêm vào giỏ → mini cart drawer */
log('6) Thêm vào giỏ → mini cart');
await page.evaluate(() => window.scrollTo(0, 0));
await settle(300);
const buyBtns = await page.$$('.detail-buy .buy-row .btn-gold');
await buyBtns[0].click();
await settle(1500);
const drawerOpen = await page.$eval('.ovl--drawer-right .minicart__list', (el) => !!el).catch(() => false);
log('   mini cart mở:', drawerOpen);
await shot('06-minicart');

/* Kiểm tra link sản phẩm trong mini cart (productSlug) */
const miniLink = await page.$eval('.minicart__name a', (a) => a.getAttribute('href')).catch(() => null);
log('   link mini cart:', miniLink);

/* Đóng mini cart, sang trang giỏ */
await page.keyboard.press('Escape');
await settle(600);

/* ---------- 7. Trang giỏ ---------- */
log('7) Giỏ hàng');
await page.goto(BASE + '/gio-hang', { waitUntil: 'networkidle2' });
await settle(1800);
const hasShipBar = await page.$('.cart-ship .ship-bar').then(Boolean).catch(() => false);
const hasCross = await page.$('.cart-cross').then(Boolean).catch(() => false);
const cartLink = await page.$eval('.cart-line__name', (a) => a.getAttribute('href')).catch(() => null);
log('   free-ship bar:', hasShipBar, '| cross-sell:', hasCross, '| link dòng:', cartLink);
await shot('07-cart');

/* Xóa tất cả → confirm dialog */
log('8) Confirm xóa tất cả');
const clearBtn = await page.$('.cart-panel__foot .btn-soft');
if (clearBtn) {
  await clearBtn.click();
  await settle(800);
  const dialogVisible = await page.$('.ovl--modal .confirm__actions').then(Boolean).catch(() => false);
  log('   dialog hiện:', dialogVisible);
  await shot('08-confirm-clear');
  /* Bấm "Giữ lại" để không mất giỏ */
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.confirm__actions .btn')];
    (btns.find((b) => b.textContent.includes('Giữ lại')) || btns[0]).click();
  });
  await settle(600);
}

/* ---------- 9. Mobile: burger + mobile buy bar ---------- */
log('9) Mobile view');
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto(BASE + firstHref, { waitUntil: 'networkidle2' });
await settle(1800);
await page.click('.nav-burger');
await settle(900);
await shot('09-mobile-drawer');
await page.keyboard.press('Escape');
await settle(500);
/* Cuộn xuống để buy box khuất → mobile buy bar hiện */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.42));
await settle(1200);
const barShown = await page.$eval('.mobile-buy-bar', (el) => el.classList.contains('is-show')).catch(() => false);
log('   mobile buy bar hiện:', barShown);
await shot('10-mobile-buybar');

/* ---------- 10. 404 ---------- */
log('10) Trang 404');
await page.setViewport({ width: 1366, height: 900 });
await page.goto(BASE + '/khong-ton-tai-xyz', { waitUntil: 'networkidle2' });
await settle(1800);
const hasNfSearch = await page.$('.nf-search').then(Boolean).catch(() => false);
const hasNfPopular = await page.$('.nf-popular .p-card').then(Boolean).catch(() => false);
log('   ô tìm kiếm:', hasNfSearch, '| bánh phổ biến:', hasNfPopular);
await shot('11-404');

await browser.close();

log('\n===== Lỗi console/mạng (' + errors.length + ') =====');
for (const e of errors.slice(0, 40)) log(e);
log('Screenshots tại:', SHOTS);
