/** Khối UI dùng chung của admin: modal, ảnh phóng to, badge giá trị tag, phân trang, ô số */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PaginationMeta } from '@shared/types';

/** Ảnh nhỏ bấm là phóng full-size ngay trong trang (không mở tab mới) */
export function ZoomImage({ src, alt, caption, className }: {
  src: string; alt: string; caption?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`zoom-thumb${className ? ` ${className}` : ''}`}
        onClick={() => setOpen(true)}
        title="Xem ảnh lớn"
        aria-label={`Xem ảnh lớn: ${alt}`}
      >
        <img src={src} alt={alt} loading="lazy" />
      </button>
      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <button className="lightbox__close" onClick={() => setOpen(false)} aria-label="Đóng ảnh">✕</button>
          <figure className="lightbox__fig" onMouseDown={(e) => e.stopPropagation()}>
            <img src={src} alt={alt} className="lightbox__img" />
            <figcaption className="small">{caption || alt}</figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

export function Modal({ open, title, onClose, width = 720, children }: {
  open: boolean; title: string; onClose: () => void; width?: number; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal>
        <button className="close-x" onClick={onClose} aria-label="Đóng">✕</button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      {action}
    </div>
  );
}

export function Loading({ text = 'Đang tải dữ liệu...' }: { text?: string }) {
  return <div className="loading-block"><div className="spinner" /><div className="small">{text}</div></div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><h3 style={{ color: 'var(--cocoa)' }}>{title}</h3>{children}</div>;
}

export function Pager({ meta, page, onPage }: { meta: PaginationMeta; page: number; onPage: (p: number) => void }) {
  if (meta.totalItems === 0) return null;
  const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
  const pages: number[] = [];
  for (let i = start; i < Math.min(meta.totalPages + 1, start + 5); i++) pages.push(i);
  return (
    <nav className="pagination">
      <button className="page-btn" disabled={!meta.hasPrev} onClick={() => onPage(page - 1)}>‹</button>
      {pages[0] > 1 && <span className="small muted">…</span>}
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      {pages[pages.length - 1] < meta.totalPages && <span className="small muted">…</span>}
      <button className="page-btn" disabled={!meta.hasNext} onClick={() => onPage(page + 1)}>›</button>
    </nav>
  );
}
