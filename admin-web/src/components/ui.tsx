/** Khối UI dùng chung của admin: modal, ảnh phóng to, badge giá trị tag, phân trang, ô số */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { PaginationMeta } from '@shared/types';
import type { PaymentStatus } from '@shared';
import { PAYMENT_STATUS_LABEL } from '@shared';
import { caretAfterMoneyDigits, toMoneyText, unformatMoney } from '../lib/format';

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

/** Nhãn trạng thái thanh toán — màu rõ + chữ Việt để nhìn lướt biết ngay đơn nào chưa tiền */
export function PaymentPill({ status }: { status: PaymentStatus }) {
  const c = status === 'PAID' ? '#1D7A42' : status === 'REFUNDED' ? '#4E6E8E' : '#B06A16';
  return (
    <span className="pay-pill" style={{ color: c, background: `${c}14`, borderColor: `${c}59` }}>
      <i style={{ background: c }} aria-hidden />
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

export function Loading({ text = 'Đang tải dữ liệu...' }: { text?: string }) {
  return <div className="loading-block"><div className="spinner" /><div className="small">{text}</div></div>;
}

/** Ô nhập tiền VND: chấm mỗi nghìn + đơn vị ₫ hiện NGAY KHI GÕ.
    Nguyên tắc "không bao giờ làm rơi phím gõ":
    - Gõ thường (Unikey/EVKey kiểu SendInput): ô hiển thị dạng chấm ngay từng phím +
      đặt lại con trỏ đúng vị trí chữ số (đếm chữ số trước con trỏ rồi map sang chuỗi đã chấm).
    - Bộ gõ đang ghép âm tiết (IME Windows/mobile, isComposing=true): ô hiển thị nguyên văn
      bản nháp (tuyệt đối không ghi đè DOM giữa chừng — bộ đệm IME không bị lệch, không rơi phím);
      BÙ LẠI bằng dòng preview ngay dưới ô hiển thị '3.200 ₫' cập nhật THEO TỪNG PHÍM,
      nên chủ tiệm vẫn thấy chấm + đơn vị realtime. Khi ghép xong (space/commit) hoặc rời ô,
      ô chính tự nén thành chữ số + định dạng.
    onChange nhận chuỗi đã định dạng (lưu thẳng vào state); lúc lưu chỉ cần parseAmount. */
export function MoneyInput({ value, onChange, className = '', onFocus, onBlur, ...props }: {
  value: string;
  onChange: (formatted: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'inputMode'>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const draftRef = useRef<string | null>(null);      // bản nháp nguyên văn đang soạn IME
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const pendingCaretDigitsRef = useRef<number | null>(null);
  const shown = draft != null ? draft : toMoneyText(String(value ?? ''));
  // Preview realtime: định dạng từ bản nháp (IME) hoặc giá trị hiện tại — cập nhật từng phím
  const previewText = toMoneyText(String(draft ?? value ?? ''));
  const showPreview = focused && unformatMoney(previewText).length > 0;

  // Sau lần render thay đổi giá trị: đặt con trỏ về đúng vị trí chữ số vừa gõ
  useLayoutEffect(() => {
    if (pendingCaretDigitsRef.current == null || composingRef.current) return;
    const el = inputRef.current;
    const digitsBefore = pendingCaretDigitsRef.current;
    pendingCaretDigitsRef.current = null;
    if (!el || document.activeElement !== el) return;
    const pos = caretAfterMoneyDigits(el.value, digitsBefore);
    try { el.setSelectionRange(pos, pos); } catch { /* bọn IME chặn thì bỏ qua */ }
  }, [shown]);

  /** Nén bản nháp còn chữ số, định dạng và trả về state cha; con trỏ về cuối chuỗi */
  const commitDraft = (raw: string) => {
    const formatted = toMoneyText(raw);
    draftRef.current = null;
    setDraft(null);
    pendingCaretDigitsRef.current = unformatMoney(formatted).length;
    onChange(formatted);
  };

  return (
    <div className={`money-input${className ? ` ${className}` : ''}`}>
      <input {...props} ref={inputRef} type="text" inputMode="numeric" value={shown}
        onChange={(e) => {
          const el = e.target;
          const raw = el.value ?? '';
          const ime = composingRef.current || (e.nativeEvent as InputEvent | undefined)?.isComposing === true;
          if (ime) {
            // Đang ghép âm tiết: giữ nguyên văn để người dùng thấy phím của mình,
            // KHÔNG ghi đè DOM (IME không bị lệch), KHÔNG làm rơi ký tự.
            draftRef.current = raw;
            setDraft(raw);
            return;
          }
          const caret = el.selectionStart ?? raw.length;
          pendingCaretDigitsRef.current = unformatMoney(raw.slice(0, caret)).length;
          draftRef.current = null;
          setDraft(null);
          onChange(toMoneyText(raw));
        }}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => {
          composingRef.current = false;
          commitDraft(draftRef.current ?? inputRef.current?.value ?? '');
        }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => {
          setFocused(false);
          // Rời ô: nếu còn bản nháp IME sót thì chốt luôn, rồi chuẩn hoá dạng đã chấm
          if (composingRef.current || draftRef.current != null) {
            composingRef.current = false;
            commitDraft(draftRef.current ?? e.target.value ?? '');
          }
          onBlur?.(e);
        }}
        className="input money-input__field" />
      <span className="money-input__unit" aria-hidden>₫</span>
      {showPreview && <div className="money-input__preview" aria-hidden>{previewText} ₫</div>}
    </div>
  );
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
