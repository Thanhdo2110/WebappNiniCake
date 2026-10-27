/** Toast thông báo cho admin */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ToastKind = 'info' | 'ok' | 'err';

interface ToastItem { id: number; text: string; kind: ToastKind }

const ToastContext = createContext<{ toast: (text: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev.slice(-3), { id, text, kind }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role="status">{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast đặt trong ToastProvider');
  return ctx;
}
