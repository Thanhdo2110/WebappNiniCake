/** Chẩn đoán nhanh: mobile buy bar trên PDP */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5173/san-pham/banh-kem-socola-ngay-tet', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 2000));
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.42));
await new Promise((r) => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const el = document.querySelector('.mobile-buy-bar');
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const anc = [];
  let n = el.parentElement;
  while (n && n !== document.documentElement) {
    const s = getComputedStyle(n);
    if (s.transform !== 'none' || s.filter !== 'none' || s.backdropFilter !== 'none' || s.willChange.includes('transform') || s.contain.includes('paint') || s.contain.includes('layout')) {
      anc.push({ cls: n.className?.toString().slice(0, 60), transform: s.transform, filter: s.filter, backdrop: s.backdropFilter, willChange: s.willChange, contain: s.contain });
    }
    n = n.parentElement;
  }
  return { found: true, cls: el.className, display: cs.display, position: cs.position, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, zIndex: cs.zIndex, transform: cs.transform, ancestors: anc, scrollY: window.scrollY, innerH: window.innerHeight };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
