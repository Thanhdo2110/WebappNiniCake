/** Phân trang dùng meta trả về từ API */
import type { PaginationMeta } from '@shared/types';
import { prefersReducedMotion } from '../hooks/motion';

export function Pagination({
  meta,
  page,
  onPage,
  scrollTop = true,
}: {
  meta: PaginationMeta;
  page: number;
  onPage: (p: number) => void;
  /** Cuộn mượt về đầu trang khi đổi trang (tắt nếu trang tự xử lý). */
  scrollTop?: boolean;
}) {
  if (meta.totalItems === 0) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
  for (let i = start; i < Math.min(meta.totalPages + 1, start + 5); i++) pages.push(i);

  const go = (p: number) => {
    onPage(p);
    if (scrollTop) window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <nav className="pagination" aria-label="Chuyển trang">
      <button className="page-btn" disabled={!meta.hasPrev} onClick={() => go(page - 1)} aria-label="Trang trước">‹</button>
      {pages[0] > 1 && <span className="muted small" aria-hidden>…</span>}
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${p === page ? 'active' : ''}`}
          onClick={() => go(p)}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Trang ${p}`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < meta.totalPages && <span className="muted small" aria-hidden>…</span>}
      <button className="page-btn" disabled={!meta.hasNext} onClick={() => go(page + 1)} aria-label="Trang sau">›</button>
    </nav>
  );
}
