/** Toast thông báo gọn (không phụ thuộc thư viện ngoài), có nút tắt thủ công */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ToastKind = 'info' | 'ok' | 'err';

interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
  leaving?: boolean;
}

interface ToastContextValue {
  toast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev.slice(-3), { id, text, kind }]);
    window.setTimeout(() => setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 3200);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3560);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast${t.kind === 'err' ? ' err' : t.kind === 'ok' ? ' ok' : ''}${t.leaving ? ' toast--leave' : ''}`}
          >
            <span className="toast__text">{t.text}</span>
            <button type="button" className="toast__x" onClick={() => dismiss(t.id)} aria-label="Tắt thông báo">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng trong ToastProvider');
  return ctx;
}
