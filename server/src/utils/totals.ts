import type { CouponType } from '@ninicakes/shared';

/** ===== Tính giá thuần (pure) — dùng cho cả service và unit test ===== */

export interface PriceableCouple {
  price: number;
  quantity: number;
}

export interface CouponLike {
  type: CouponType | string;
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
}

export interface CouponEval {
  valid: boolean;
  discount: number;
  reason?: string;
}

/** Tính giảm giá từ mã. Trả về {valid, discount, reason} — không ném lỗi. */
export function evalCoupon(
  coupon: CouponLike | null | undefined,
  subtotal: number,
  now: Date = new Date()
): CouponEval {
  if (!coupon) return { valid: false, discount: 0, reason: 'Mã giảm giá không tồn tại.' };

  if (subtotal < (coupon.minSubtotal || 0)) {
    return {
      valid: false,
      discount: 0,
      reason: `Đơn hàng cần tối thiểu ${coupon.minSubtotal.toLocaleString('vi-VN')}đ để dùng mã này.`,
    };
  }

  let discount = 0;
  if (coupon.type === 'PERCENT') {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else if (coupon.type === 'AMOUNT') {
    discount = coupon.value;
  } else {
    return { valid: false, discount: 0, reason: 'Loại mã giảm giá không hợp lệ.' };
  }

  if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  if (discount > subtotal) discount = subtotal;

  void now;
  return { valid: true, discount };
}

export interface Totals {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

/**
 * Tổng hợp giỏ/đơn hàng.
 * - subtotal: tổng tiền hàng
 * - discount: tiền giảm từ mã (không vượt subtotal)
 * - shippingFee: phí collector truyền vào (đã xét miễn phí/ PickUp)
 * - total: subtotal - discount + shippingFee
 */
export function computeTotals(
  items: PriceableCouple[],
  opts: { discount?: number; shippingFee?: number } = {}
): Totals {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = Math.max(0, Math.floor(opts.discount || 0)) || 0;
  if (discount > subtotal) discount = subtotal;
  const shippingFee = Math.max(0, Math.floor(opts.shippingFee || 0));
  const total = subtotal - discount + shippingFee;
  return { subtotal, discount, shippingFee, total };
}

/** Miễn phí vận chuyển nếu đạt ngưỡng */
export function shippingFeeFor(
  subtotal: number,
  shippingFeeVnd: number,
  freeShippingMinVnd: number,
  deliveryType: string
): number {
  if (deliveryType === 'PICKUP') return 0;
  if (freeShippingMinVnd > 0 && subtotal >= freeShippingMinVnd) return 0;
  return shippingFeeVnd;
}
