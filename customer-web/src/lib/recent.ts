/** "Đã xem gần đây" lưu ở localStorage — không cần server, riêng từng trình duyệt */
import type { ProductListDTO } from '@shared/types';

const KEY = 'nc_recent_viewed';
const LIMIT = 8;

export function getRecentlyViewed(): ProductListDTO[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x.slug === 'string' && typeof x.id === 'number') as ProductListDTO[];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(p: ProductListDTO): void {
  try {
    const list = [p, ...getRecentlyViewed().filter((x) => x.id !== p.id)].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* localStorage đầy hoặc chế độ riêng tư — bỏ qua */
  }
}
