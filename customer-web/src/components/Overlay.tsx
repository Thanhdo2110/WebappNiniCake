/** Overlay dùng chung: modal, drawer trượt cạnh, hộp thoại xác nhận.
    Portal + khóa cuộn + bẫy tiêu điểm + Escape, có hoạt cảnh đóng. */
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useBodyScrollLock, useFocusTrap } from '../hooks/a11y';

export type OverlayVariant = 'modal' | 'drawer-right' | 'drawer-left' | 'sheet';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: OverlayVariant;
  size?: 'sm' | 'md' | 'lg';
  closeLabel?: string;
}

export function Overlay({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'modal',
  size = 'md',
  closeLabel = 'Đóng',
}: OverlayProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 220);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted]);

  useBodyScrollLock(mounted);
  const trapRef = useFocusTrap<HTMLDivElement>(mounted && !closing, onClose);

  if (!mounted) return null;

  const panel = (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      className={`ovl__panel ovl__panel--${variant} ovl__panel--${size}${closing ? ' is-closing' : ''}`}
    >
      <header className="ovl__head">
        <div className="ovl__title" id={titleId}>{title}</div>
        <button type="button" className="ovl__x" onClick={onClose} aria-label={closeLabel}>
          <X size={18} />
        </button>
      </header>
      <div className="ovl__body">{children}</div>
      {footer && <footer className="ovl__foot">{footer}</footer>}
    </div>
  );

  return createPortal(
    <div className={`ovl ovl--${variant}${closing ? ' is-closing' : ''}`}>
      <div className="ovl__scrim" onClick={onClose} aria-hidden />
      {panel}
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
}

/** Hộp thoại xác nhận cho thao tác nguy hiểm (xóa giỏ, hủy đơn, xóa địa chỉ...). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <Overlay open={open} onClose={pending ? () => {} : onClose} title={title} size="sm" variant="modal">
      {message && <p className="muted confirm__msg">{message}</p>}
      <div className="confirm__actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? 'Đang xử lý...' : confirmLabel}
        </button>
      </div>
    </Overlay>
  );
}
