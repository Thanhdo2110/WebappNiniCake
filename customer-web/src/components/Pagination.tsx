/** Phân trang dùng meta trả về từ API */
import type { PaginationMeta } from '@shared/types';

export function Pagination({ meta, page, onPage }: { meta: PaginationMeta; page: number; onPage: (p: number) => void }) {
  if (meta.totalItems === 0) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
  for (let i = start; i < Math.min(meta.totalPages + 1, start + 5); i++) pages.push(i);

  return (
    <nav className="pagination">
      <button className="page-btn" disabled={!meta.hasPrev} onClick={() => onPage(page - 1)} aria-label="Trang trước">‹</button>
      {pages[0] > 1 && <span className="muted small">…</span>}
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < meta.totalPages && <span className="muted small">…</span>}
      <button className="page-btn" disabled={!meta.hasNext} onClick={() => onPage(page + 1)} aria-label="Trang sau">›</button>
    </nav>
  );
}
