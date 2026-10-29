/** Cột mốc miễn phí giao hàng — dùng chung cho giỏ mini trên header và cột tạm tính ở trang giỏ. */
import { Truck } from 'lucide-react';
import { formatVND } from '../lib/format';

export function ShipProgress({ min, subtotal }: { min?: number | null; subtotal: number }) {
  /* min rỗng khi /settings chưa về: ẩn hẳn thay vì loé "mua thêm 1.500.000 ₫" */
  if (!min || min <= 0) return null;
  const remaining = Math.max(0, min - subtotal);
  const progress = Math.min(100, (subtotal / min) * 100);

  return (
    <div className="ship-note" role="status">
      <span className="ship-note__icon" aria-hidden>
        <Truck size={15} />
      </span>
      <span className="ship-note__text small">
        {remaining > 0 ? (
          <>
            Mua thêm <b>{formatVND(remaining)}</b> để được <b>miễn phí giao hàng</b>
          </>
        ) : (
          <b>Đơn đủ điều kiện miễn phí giao hàng!</b>
        )}
      </span>
      <div className="ship-bar" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
