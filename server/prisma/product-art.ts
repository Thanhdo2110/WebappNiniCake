/* Vẽ minh họa SVG cho từng sản phẩm khi seed — để storefront không dùng ảnh tạm.
   Sản phẩm ghi ra server/uploads/images/products/ và đường dẫn DB lưu là /uploads/images/products/<slug>-<góc>.svg */
import fs from 'node:fs';
import path from 'node:path';

type Palette = { base: string; cream: string; accent: string; garnish: string; bg: string };

const PALETTES: Record<string, Palette> = {
  chocolate: { base: '#4A3426', cream: '#C9A96E', accent: '#6B4A32', garnish: '#E9CFC9', bg: '#F3E9DC' },
  matcha: { base: '#7E9478', cream: '#EDF0E7', accent: '#A9B8A0', garnish: '#E9CFC9', bg: '#EFF1EA' },
  strawberry: { base: '#D98A8A', cream: '#FBEDEB', accent: '#E9CFC9', garnish: '#C9A96E', bg: '#FAF1EE' },
  yuzu: { base: '#E4C069', cream: '#FCF3DF', accent: '#C9A96E', garnish: '#E9CFC9', bg: '#FAF5E9' },
  taro: { base: '#9A8CB0', cream: '#EFEAF4', accent: '#C9A96E', garnish: '#E9CFC9', bg: '#F2EFF6' },
  cream: { base: '#E6D2B5', cream: '#FBF3E7', accent: '#C9A96E', garnish: '#A9B8A0', bg: '#FAF6F0' },
  roasted: { base: '#B07C4F', cream: '#F1DEC6', accent: '#8A6D55', garnish: '#E9CFC9', bg: '#F6EDE2' },
};

type FormKind = 'tier' | 'roll' | 'loaf' | 'asian' | 'cup' | 'slab' | 'macaron';

const FORM_BY_CATEGORY: Record<string, FormKind> = {
  'banh-kem': 'tier',
  'banh-ngot': 'roll',
  'banh-mi': 'loaf',
  'banh-truyen-thong': 'asian',
  'banh-theo-mua': 'tier',
};

/** Bentuk bánh ưu tiên theo tên — danh mục gộp nhiều loại nên cần phân biệt silhouette */
const FORM_BY_NAME: [RegExp, FormKind][] = [
  [/macaron|macarons/i, 'macaron'],
  [/tiramisu|mousse|panna cotta|pudding|chè/i, 'cup'],
  [/cheesecake|opera|brownie|mille|mille-cr|layer/i, 'slab'],
  [/croissant|pain au chocolat|baguette|bánh mì|sandwich/i, 'loaf'],
  [/xu xê|choux|eclair/i, 'roll'],
];

function resolveForm(name: string, category: string): FormKind {
  for (const [re, kind] of FORM_BY_NAME) if (re.test(name)) return kind;
  return FORM_BY_CATEGORY[category] ?? 'tier';
}

export function paletteFor(flavor: string, category: string): Palette {
  const f = flavor.toLowerCase();
  if (f.includes('socola') || f.includes('cacao') || f.includes('coffee') || f.includes('cà phê') || f.includes('espresso')) return PALETTES.chocolate;
  if (f.includes('matcha') || f.includes('chè') || f.includes('sen') || f.includes('lá dứa') || f.includes('dứa matcha')) return PALETTES.matcha;
  if (f.includes('dâu') || f.includes('vải') || f.includes('rose') || f.includes('hồng')) return PALETTES.strawberry;
  if (f.includes('yuzu') || f.includes('chanh') || f.includes('cam') || f.includes('xoài') || f.includes('mật ong')) return PALETTES.yuzu;
  if (f.includes('taro') || f.includes('khoai môn') || f.includes('lavender')) return PALETTES.taro;
  if (f.includes('bơ') || f.includes('ngũ cốc') || f.includes('hạnh nhân') || f.includes('pistachio')) return PALETTES.roasted;
  if (category === 'banh-mi') return PALETTES.roasted;
  return PALETTES.cream;
}

const escapeAttr = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);

const defs = (p: Palette, id: string) => `
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.bg}"/><stop offset="1" stop-color="#FAF6F0"/>
    </linearGradient>
    <linearGradient id="cr${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".92"/><stop offset="1" stop-color="${p.cream}"/>
    </linearGradient>
    <radialGradient id="sh${id}" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#4A3426" stop-opacity=".18"/><stop offset="1" stop-color="#4A3426" stop-opacity="0"/>
    </radialGradient>
    <pattern id="sea${id}" width="60" height="30" patternUnits="userSpaceOnUse">
      <path d="M0 30 A30 30 0 0 1 60 30" fill="none" stroke="${p.accent}" stroke-opacity=".16" stroke-width="2"/>
      <path d="M-30 30 A30 30 0 0 1 30 30" fill="none" stroke="${p.accent}" stroke-opacity=".1" stroke-width="2"/>
    </pattern>
  </defs>`;

const frame = (p: Palette, id: string) => `
  <rect width="900" height="675" fill="url(#bg${id})"/>
  <rect y="470" width="900" height="205" fill="url(#sea${id})" opacity=".7"/>
  <ellipse cx="450" cy="500" rx="300" ry="42" fill="url(#sh${id})"/>
  <circle cx="838" cy="72" r="26" fill="none" stroke="#C9A96E" stroke-opacity=".5" stroke-width="1.5"/>
  <path d="M838 54 c7 8 7 14 0 18 c-7 -4 -7 -10 0 -18z" fill="${p.garnish}" opacity=".85"/>`;

function form(kind: string, p: Palette, seed: number, id: string): string {
  const rnd = (n: number) => ((seed * 9301 + n * 49297) % 233) / 233;
  if (kind === 'loaf') {
    return `
    <g transform="translate(450 355)">
      <ellipse cx="0" cy="105" rx="245" ry="26" fill="${p.base}" opacity=".12"/>
      <path d="M-235 20 q0 -95 55 -110 q175 -50 360 0 q55 15 55 110 q0 45 -55 50 q-175 30 -360 0 q-55 -5 -55 -50z" fill="${p.base}"/>
      <path d="M-235 20 q0 -95 55 -110 q175 -50 360 0 q55 15 55 110" fill="url(#cr${id})" opacity=".22"/>
      ${[-150, -60, 30, 120].map((x, i) => `<path d="M${x} ${-58 + i * 3} q28 -26 56 0" stroke="${p.cream}" stroke-width="9" fill="none" stroke-linecap="round" opacity=".85"/>`).join('')}
      <ellipse cx="-90" cy="-70" rx="120" ry="26" fill="#FFFFFF" opacity=".22"/>
    </g>`;
  }
  if (kind === 'roll') {
    return `
    <g transform="translate(450 340)">
      <rect x="-210" y="-30" width="420" height="150" rx="70" fill="${p.base}"/>
      <rect x="-210" y="-30" width="420" height="70" rx="35" fill="url(#cr${id})" opacity=".55"/>
      ${[-150, -60, 30, 120].map((x, i) => `<path d="M${x} -28 q18 ${28 + i * 4} 36 0" fill="${p.cream}" opacity=".9"/>`).join('')}
      <circle cx="-150" cy="45" r="34" fill="${p.cream}"/><circle cx="-150" cy="45" r="16" fill="${p.accent}" opacity=".8"/>
      <circle cx="150" cy="45" r="34" fill="${p.cream}"/><circle cx="150" cy="45" r="16" fill="${p.garnish}" opacity=".9"/>
      <ellipse cx="0" cy="128" rx="215" ry="20" fill="${p.base}" opacity=".14"/>
    </g>`;
  }
  if (kind === 'asian') {
    const buns = [-1, 0, 1].map((c) => `
      <g transform="translate(${c * 150} ${c === 0 ? -30 : 20})">
        <path d="M-72 40 a72 72 0 0 1 144 0 z" fill="${p.base}"/>
        <path d="M-72 40 a72 72 0 0 1 144 0 z" fill="url(#cr${id})" opacity=".35"/>
        <path d="M-26 -18 q26 -16 52 0" stroke="${p.cream}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="46" rx="76" ry="12" fill="${p.base}" opacity=".2"/>
      </g>`).join('');
    return `
    <g transform="translate(450 360)">${buns}
      <ellipse cx="0" cy="118" rx="260" ry="24" fill="${p.base}" opacity=".14"/>
      <path d="M-30 96 q30 -20 60 0" stroke="${p.accent}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>
    </g>`;
  }
  if (kind === 'cup') {
    return `
    <g transform="translate(450 330)">
      <path d="M-135 -110 h270 l-24 235 a110 26 0 0 1 -222 0 z" fill="#FFFFFF" fill-opacity=".5" stroke="${p.accent}" stroke-width="7"/>
      <path d="M-118 -30 h236 l-18 150 a100 22 0 0 1 -200 0 z" fill="${p.base}" opacity=".85"/>
      <path d="M-124 -74 h248 v46 h-248z" fill="${p.cream}"/>
      <path d="M-128 -76 q128 -34 256 0" fill="${p.garnish}" opacity=".9"/>
      ${[-70, 0, 70].map((x) => `<circle cx="${x}" cy="-92" r="15" fill="${p.accent}" opacity=".9"/>`).join('')}
      <ellipse cx="0" cy="150" rx="150" ry="16" fill="${p.base}" opacity=".16"/>
      <path d="M96 -110 q54 -70 96 -74" stroke="${p.accent}" stroke-width="8" fill="none" stroke-linecap="round" opacity=".8"/>
    </g>`;
  }
  if (kind === 'slab') {
    return `
    <g transform="translate(450 345)">
      <rect x="-220" y="-120" width="440" height="215" rx="16" fill="${p.cream}"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="-220" y="${-120 + i * 54}" width="440" height="26" fill="${i % 2 ? p.accent : p.base}" opacity="${i % 2 ? '.75' : '.9'}"/>`).join('')}
      <rect x="-220" y="-120" width="440" height="215" rx="16" fill="none" stroke="${p.base}" stroke-width="8"/>
      <rect x="-220" y="-134" width="440" height="26" rx="13" fill="${p.base}"/>
      ${[-160, -60, 40, 140].map((x, i) => `<path d="M${x} -138 q22 ${i % 2 ? 16 : -16} 44 0" fill="${i % 2 ? p.garnish : p.cream}" opacity=".9"/>`).join('')}
      <ellipse cx="0" cy="120" rx="230" ry="18" fill="${p.base}" opacity=".15"/>
    </g>`;
  }
  if (kind === 'macaron') {
    const shell = (x: number, y: number, c1: string, c2: string) => `
      <g transform="translate(${x} ${y})">
        <ellipse cy="-16" rx="62" ry="30" fill="${c1}"/>
        <ellipse cy="16" rx="62" ry="30" fill="${c2}"/>
        <rect x="-60" y="-8" width="120" height="18" rx="9" fill="${p.cream}"/>
        ${Array.from({ length: 7 }, (_, i) => `<circle cx="${-54 + i * 18}" cy="-40" r="4" fill="#FFFFFF" opacity=".55"/>`).join('')}
      </g>`;
    return `
    <g transform="translate(450 330)">
      <rect x="-250" y="-90" width="500" height="215" rx="22" fill="${p.cream}" stroke="${p.accent}" stroke-width="6"/>
      <rect x="-250" y="-90" width="500" height="46" rx="22" fill="${p.base}" opacity=".9"/>
      ${shell(-125, -8, p.base, p.accent)}${shell(125, -8, p.garnish, p.accent)}${shell(0, 66, p.accent, p.base)}
      <ellipse cx="0" cy="150" rx="255" ry="20" fill="${p.base}" opacity=".15"/>
    </g>`;
  }
  /* tier: bánh kem nhiều tầng */
  const tiers = rnd(3) > 0.5 ? 3 : 2;
  let body = '';
  for (let i = 0; i < tiers; i++) {
    const w = 300 - i * 80;
    const h = 78;
    const y = 66 - i * (h + 6);
    body += `
      <rect x="${-w / 2}" y="${y}" width="${w}" height="${h}" rx="${Math.min(22, h / 3)}" fill="${i % 2 ? p.accent : p.base}"/>
      <rect x="${-w / 2}" y="${y}" width="${w}" height="${h}" rx="${Math.min(22, h / 3)}" fill="url(#cr${id})" opacity=".3"/>
      <path d="M${-w / 2} ${y + 16} h${w}" stroke="${p.cream}" stroke-width="12" stroke-linecap="round" opacity=".9"/>
      ${Array.from({ length: 5 }, (_, k) => {
        const cx = -w / 2 + 22 + (k * (w - 44)) / 4;
        return `<path d="M${cx} ${y + 8} q11 ${22 + (k % 2) * 6} 22 0" fill="${p.cream}" opacity=".95"/>`;
      }).join('')}`;
  }
  const topY = 66 - (tiers - 1) * (78 + 6);
  const dots = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2;
    return `<circle cx="${Math.cos(a) * 84}" cy="${topY - 26 + Math.sin(a) * 9}" r="${k % 2 ? 9 : 13}" fill="${k % 3 ? p.garnish : p.cream}" opacity=".95"/>`;
  }).join('');
  return `
    <g transform="translate(450 345)">${body}${dots}
      <ellipse cx="0" cy="168" rx="230" ry="22" fill="${p.base}" opacity=".16"/>
      <rect x="-240" y="150" width="480" height="16" rx="8" fill="#FFFFFF" opacity=".65"/>
    </g>`;
}

function topView(p: Palette, id: string, kind: FormKind): string {
  const square = kind === 'slab' || kind === 'macaron';
  const outer = square
    ? `<rect x="-185" y="-150" width="370" height="300" rx="46" fill="${p.base}"/><rect x="-185" y="-150" width="370" height="300" rx="46" fill="url(#cr${id})" opacity=".28"/>`
    : `<circle r="200" fill="${p.base}"/><circle r="200" fill="url(#cr${id})" opacity=".28"/>`;
  const mid = square
    ? `<rect x="-130" y="-102" width="260" height="204" rx="34" fill="${p.cream}" opacity=".6"/><rect x="-80" y="-62" width="160" height="124" rx="26" fill="${p.accent}" opacity=".75"/>`
    : `<circle r="150" fill="${p.cream}" opacity=".55"/><circle r="98" fill="${p.accent}" opacity=".75"/>`;
  const garnish = square
    ? `${[-1, 0, 1].map((i) => `<circle cx="${i * 84}" cy="-46" r="16" fill="${p.garnish}" opacity=".95"/>`).join('')}${[-1, 0, 1].map((i) => `<circle cx="${i * 84}" cy="46" r="16" fill="${p.cream}" opacity=".95"/>`).join('')}`
    : `<circle r="46" fill="${p.garnish}" opacity=".95"/>`;
  const dots = square
    ? ''
    : Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `<circle cx="${Math.cos(a) * 175}" cy="${Math.sin(a) * 175}" r="${i % 2 ? 11 : 17}" fill="#FFFFFF" opacity=".8"/>`;
      }).join('');
  return `
  <g transform="translate(450 330)">
    ${outer}${mid}${garnish}${dots}
    <ellipse cy="205" rx="215" ry="22" fill="${p.base}" opacity=".15"/>
  </g>`;
}

function sliceView(p: Palette, id: string, kind: FormKind): string {
  const layered = kind === 'slab' || kind === 'cup' || kind === 'macaron';
  if (layered) {
    return `
  <g transform="translate(440 350)">
    <rect x="-180" y="-160" width="360" height="290" rx="20" fill="${p.cream}"/>
    <rect x="-180" y="-160" width="360" height="290" rx="20" fill="none" stroke="${p.base}" stroke-width="9"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="-180" y="${-132 + i * 66}" width="360" height="30" fill="${i % 2 ? p.accent : p.base}" opacity=".82"/>`).join('')}
    <path d="M-180 -160 q180 -34 360 0" fill="${p.garnish}" opacity=".9"/>
    <ellipse cx="0" cy="152" rx="200" ry="18" fill="${p.base}" opacity=".14"/>
    <rect x="-215" y="132" width="430" height="14" rx="7" fill="#FFFFFF" opacity=".7"/>
  </g>`;
  }
  return `
  <g transform="translate(430 345)">
    <path d="M-190 120 L-40 -170 L190 120 Z" fill="${p.cream}"/>
    <path d="M-190 120 L-40 -170 L190 120 Z" fill="none" stroke="${p.base}" stroke-width="10"/>
    <path d="M-140 60 h280" stroke="${p.base}" stroke-width="16" opacity=".8"/>
    <path d="M-105 0 h210" stroke="${p.accent}" stroke-width="14" opacity=".85"/>
    <path d="M-70 -60 h140" stroke="${p.garnish}" stroke-width="14" opacity=".95"/>
    <circle cx="0" cy="-150" r="26" fill="${p.garnish}"/>
    <ellipse cx="0" cy="140" rx="210" ry="20" fill="${p.base}" opacity=".14"/>
    <rect x="-230" y="120" width="460" height="14" rx="7" fill="#FFFFFF" opacity=".7"/>
  </g>`;
}

/** Trả về 3 góc ảnh cho một sản phẩm; đồng thời ghi file ra uploads */
export function writeProductArtwork(slug: string, name: string, flavor: string, category: string): { url: string; alt: string }[] {
  const p = paletteFor(flavor, category);
  const formKind = resolveForm(name, category);
  const seed = slug.length + name.charCodeAt(0);
  const views = [
    { key: 'front', body: (id: string) => form(formKind, p, seed, id) },
    { key: 'top', body: (id: string) => topView(p, id, formKind) },
    { key: 'slice', body: (id: string) => sliceView(p, id, formKind) },
  ];
  const dir = path.resolve(process.cwd(), 'uploads', 'images', 'products');
  fs.mkdirSync(dir, { recursive: true });
  return views.map((v) => {
    const id = v.key + seed;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="150 100 600 450" width="800" height="600" role="img" aria-label="${escapeAttr(name)}">${defs(p, id)}${frame(p, id)}${v.body(id)}</svg>`;
    fs.writeFileSync(path.join(dir, `${slug}-${v.key}.svg`), svg, 'utf8');
    return { url: `/uploads/images/products/${slug}-${v.key}.svg`, alt: `${name} — ${v.key === 'front' ? 'ảnh chính' : v.key === 'top' ? 'mặt bánh từ trên' : 'lát cắt bên trong'}` };
  });
}

/** Banner Hero 1600x640: nền kem, seigaiha, hoa anh đào rơi + khối bánh mờ */
export function writeBannerArtwork(key: string, tone: 'sakura' | 'cacao'): string {
  const p = tone === 'sakura' ? PALETTES.strawberry : PALETTES.chocolate;
  const blossoms = Array.from({ length: 16 }, (_, i) => {
    const x = ((i * 197) % 1560) + 20;
    const y = ((i * 271) % 560) + 40;
    const r = 8 + (i % 4) * 5;
    return `<g transform="translate(${x} ${y}) rotate(${(i * 37) % 360})" opacity="${0.25 + (i % 5) * 0.1}">
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="${-r}" rx="${r * 0.55}" ry="${r}" fill="${p.garnish}" transform="rotate(${a})"/>`).join('')}
      <circle r="${r * 0.35}" fill="${p.cream}"/></g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 640" width="1600" height="640" role="img" aria-label="Nini Cakes">
  ${defs(p, key)}
  <rect width="1600" height="640" fill="url(#bg${key})"/>
  <rect y="380" width="1600" height="260" fill="url(#sea${key})"/>
  <g transform="translate(1180 330)" opacity=".92">
    <ellipse cy="210" rx="300" ry="34" fill="url(#sh${key})"/>
    <rect x="-210" y="40" width="420" height="150" rx="34" fill="${p.base}"/>
    <rect x="-150" y="-90" width="300" height="140" rx="30" fill="${p.accent}"/>
    <rect x="-95" y="-190" width="190" height="110" rx="26" fill="${p.base}"/>
    <rect x="-210" y="40" width="420" height="150" rx="34" fill="url(#cr${key})" opacity=".26"/>
    <rect x="-150" y="-90" width="300" height="140" rx="30" fill="url(#cr${key})" opacity=".26"/>
    <rect x="-95" y="-190" width="190" height="110" rx="26" fill="url(#cr${key})" opacity=".26"/>
    ${Array.from({ length: 7 }, (_, i) => `<circle cx="${-180 + i * 60}" cy="${i % 2 ? 42 : -92}" r="13" fill="${p.garnish}"/>`).join('')}
  </g>
  ${blossoms}
  <g opacity=".9">
    <path d="M120 300 q60 -110 120 0 q-60 110 -120 0z" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".5"/>
    <path d="M120 340 h150" stroke="${p.cream}" stroke-width="1" opacity=".6"/>
  </g>
</svg>`;
  const dir = path.resolve(process.cwd(), 'uploads', 'images', 'banners');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${key}.svg`), svg, 'utf8');
  return `/uploads/images/banners/${key}.svg`;
}
