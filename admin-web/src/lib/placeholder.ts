/** Ảnh thay thế khi bản ghi chưa có URL (hình bánh vẽ sẵn) */
const CAKE_SVG = (label: string) => {
  const text = encodeURIComponent(label.slice(0, 24));
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="#F2E9DC"/>
  <circle cx="240" cy="172" r="104" fill="#FBF7F0" stroke="#C9A96E" stroke-width="4"/>
  <path d="M240 82 c27 0 47 19 47 42 0 21-21 31-47 31 s-47-10-47-31 c0-23 20-42 47-42z" fill="#C9A96E"/>
  <path d="M175 226 h130" stroke="#5B4636" stroke-width="6" stroke-linecap="round"/>
  <text x="240" y="316" text-anchor="middle" font-family="Arial" font-size="20" fill="#8A6D55">${text}</text>
</svg>`
    )
  );
};

const MEMO = new Map<string, string>();

export function imageUrl(url: string | null | undefined, label = 'Nini'): string {
  if (url && url.trim()) return url;
  const key = label + '__x';
  const c = MEMO.get(key);
  if (c) return c;
  const made = CAKE_SVG(label);
  MEMO.set(key, made);
  return made;
}
