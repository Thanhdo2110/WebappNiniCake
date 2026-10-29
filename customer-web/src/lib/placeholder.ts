/** Ảnh thay thế vẽ sẵn — bánh cacao trên nền kem ngà, có chữ ghi tên sản phẩm */
const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);

const CAKE_SVG = (label: string) => {
  const text = escapeXml(label.slice(0, 26));
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
  <rect width="600" height="450" fill="#FAF6EF"/>
  <circle cx="300" cy="215" r="130" fill="#FFFDF9" stroke="#B9925F" stroke-width="3"/>
  <path d="M300 100 c34 0 60 24 60 54 0 27-27 40-60 40 s-60-13-60-40 c0-30 26-54 60-54z" fill="#D3B183"/>
  <circle cx="262" cy="196" r="14" fill="#D9A3AA"/>
  <circle cx="338" cy="196" r="14" fill="#D9A3AA"/>
  <path d="M228 280 h144" stroke="#4B3629" stroke-width="7" stroke-linecap="round"/>
  <path d="M228 302 h110" stroke="#7A6353" stroke-width="5" stroke-linecap="round"/>
  <text x="300" y="392" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#7A6353">${text}</text>
</svg>`
    )
  );
};

const MEMO = new Map<string, string>();

/** Trả về URL hiển thị: ảnh thật nếu có, ngược lại placeholder SVG data-uri */
export function imageUrl(url: string | null | undefined, label = 'Nini Cakes'): string {
  if (url && url.trim()) return url;
  const key = label + '__fallback';
  const cached = MEMO.get(key);
  if (cached) return cached;
  const generated = CAKE_SVG(label);
  MEMO.set(key, generated);
  return generated;
}

/** Dùng cho onError của <img>: ảnh lỗi/404 tự hạ xuống placeholder có tên bánh. */
export function imgFallback(label = 'Nini Cakes') {
  return (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget;
    if (img.dataset.fallback === '1') return;
    img.dataset.fallback = '1';
    img.src = imageUrl(null, label);
  };
}
