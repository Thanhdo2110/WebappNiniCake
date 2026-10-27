import { describe, expect, it } from 'vitest';
import { computeTotals, evalCoupon, shippingFeeFor } from '../src/utils/totals.js';
import { canTransition, DELIVERY_TIME_SLOTS } from '@ninicakes/shared';

describe('evalCoupon (tính mã giảm giá)', () => {
  const percent = { type: 'PERCENT', value: 10, minSubtotal: 200000, maxDiscount: 100000 };
  const amount = { type: 'AMOUNT', value: 150000, minSubtotal: 500000 };

  it('mã phần trăm giảm đúng 10% và bị chặn bởi maxDiscount', () => {
    expect(evalCoupon(percent, 800000, new Date())).toEqual({ valid: true, discount: 80000 });
    // 10% của 2.000.000 = 200.000 > max 100.000 => chặn còn 100.000
    expect(evalCoupon(percent, 2000000, new Date())).toEqual({ valid: true, discount: 100000 });
  });

  it('mã số tiền cố định giảm đúng giá trị, không vượt subtotal', () => {
    expect(evalCoupon(amount, 600000, new Date()).discount).toBe(150000);
    const tiny = { type: 'AMOUNT', value: 100000, minSubtotal: 0, maxDiscount: null };
    expect(evalCoupon(tiny, 50000, new Date())).toEqual({ valid: true, discount: 50000 });
  });

  it('không đạt mức tối thiểu => báo lỗi kèm mức yêu cầu', () => {
    const r = evalCoupon(percent, 100000, new Date());
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('tối thiểu');
    expect(r.discount).toBe(0);
  });

  it('loại mã lạ hoặc mã không tồn tại => không hợp lệ', () => {
    expect(evalCoupon({ type: 'SHIPPING', value: 1, minSubtotal: 0 }, 500000).valid).toBe(false);
    expect(evalCoupon(null, 500000).valid).toBe(false);
  });
});

describe('computeTotals (tổng hợp tiền giỏ/đơn)', () => {
  it('total = subtotal - discount + shippingFee', () => {
    const t = computeTotals(
      [
        { price: 480000, quantity: 1 },
        { price: 45000, quantity: 2 },
      ],
      { discount: 80000, shippingFee: 30000 }
    );
    expect(t).toEqual({ subtotal: 570000, discount: 80000, shippingFee: 30000, total: 520000 });
  });

  it('discount không được vượt subtotal, âm về 0', () => {
    expect(computeTotals([{ price: 100000, quantity: 1 }], { discount: 999999 }).discount).toBe(100000);
    expect(computeTotals([{ price: 100000, quantity: 1 }], { discount: -50 }).discount).toBe(0);
  });
});

describe('shippingFeeFor (phí giao hàng theo cài đặt)', () => {
  it('nhận tại tiệm -> 0đ', () => {
    expect(shippingFeeFor(100000, 30000, 1500000, 'PICKUP')).toBe(0);
  });

  it('đơn đạt ngưỡng miễn phí -> 0đ, ngược lại tính phí cài đặt', () => {
    expect(shippingFeeFor(1500000, 30000, 1500000, 'DELIVERY')).toBe(0);
    expect(shippingFeeFor(1000000, 30000, 1500000, 'DELIVERY')).toBe(30000);
  });
});

describe('canTransition (luồng trạng thái đơn hàng)', () => {
  it('luồng chuẩn giao tận nơi', () => {
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'READY')).toBe(true);
    expect(canTransition('READY', 'SHIPPED')).toBe(true);
    expect(canTransition('SHIPPED', 'COMPLETED')).toBe(true);
  });

  it('nhận tại tiệm không đi qua SHIPPED', () => {
    expect(canTransition('READY', 'COMPLETED')).toBe(true);
    expect(canTransition('PENDING', 'READY')).toBe(false);
  });

  it('trạng thái cuối không chuyển tiếp; nhảy cóc bị chặn', () => {
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'PENDING')).toBe(false);
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
  });

  it('khung giờ nhận bánh hợp lệ định dạng HH:MM - HH:MM', () => {
    expect(DELIVERY_TIME_SLOTS.length).toBeGreaterThan(2);
    for (const slot of DELIVERY_TIME_SLOTS) {
      expect(slot).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    }
  });
});
