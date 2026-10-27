/** Các phần tử nhỏ dùng lại: tag trạng thái, tag thanh toán, tag khối linh hoạt */
import type { ReactNode } from 'react';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@shared';

export function StatusTag({ status }: { status: keyof typeof ORDER_STATUS_LABEL }) {
  const color = ORDER_STATUS_COLOR[status];
  return (
    <span className="tag" style={{ background: `${color}22`, color, fontWeight: 700 }}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function FlexTag({ color, children }: { color: string; children: ReactNode }) {
  return <span className="tag" style={{ background: `${color}1c`, color, fontWeight: 600 }}>{children}</span>;
}
