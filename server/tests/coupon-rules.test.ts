import { describe, expect, it } from 'vitest';
import { computeTotals, evalCoupon, shippingFeeFor } from '../src/utils/totals.js';

/** Thử các mã seed thường dùng trong menu khuyến mãi của tiệm */
describe('Quy tắc mã giảm giá Nini Cakes', () => {
  it('WELCOME10: 10% cho đơn đầu tiên, tối đa 100.000đ, đơn từ 200.000đ', () => {
    const coupon = { type: 'PERCENT', value: 10, minSubtotal: 200000, maxDiscount: 100000 };
    expect(evalCoupon(coupon, 250000, new Date()).discount).toBe(25000);
    expect(evalCoupon(coupon, 5500000, new Date()).discount).toBe(100000);
    expect(evalCoupon(coupon, 150000, new Date()).valid).toBe(false);
  });

  it('NINI150K: giảm 150.000đ cho đơn từ 500.000đ', () => {
    const coupon = { type: 'AMOUNT', value: 150000, minSubtotal: 500000 };
    expect(evalCoupon(coupon, 500000, new Date())).toEqual({ valid: true, discount: 150000 });
    expect(evalCoupon(coupon, 499990, new Date()).valid).toBe(false);
  });

  it('SAKURA25: 25% cho bánh theo mùa, tối đa 250.000đ', () => {
    const coupon = { type: 'PERCENT', value: 25, minSubtotal: 500000, maxDiscount: 250000 };
    expect(evalCoupon(coupon, 800000, new Date()).discount).toBe(200000);
    expect(evalCoupon(coupon, 1800000, new Date()).discount).toBe(250000);
  });

  it('đơn full mẫu miễn phí giao và còn được giảm giá', () => {
    const items = [
      { price: 650000, quantity: 1 },
      { price: 450000, quantity: 1 },
    ];
    const discount = evalCoupon({ type: 'AMOUNT', value: 150000, minSubtotal: 500000 }, 1100000, new Date()).discount;
    const shipping = shippingFeeFor(1100000, 30000, 1500000, 'DELIVERY');
    const totals = computeTotals(items, { discount, shippingFee: shipping });
    expect(totals.total).toBe(980000);
  });

  it('đơn nhận tại tiệm không tính phí giao, tổng trừ coupon', () => {
    const items = [{ price: 520000, quantity: 2 }];
    const discount = evalCoupon({ type: 'PERCENT', value: 10, minSubtotal: 200000, maxDiscount: 100000 }, 1040000, new Date()).discount;
    const totals = computeTotals(items, { discount, shippingFee: shippingFeeFor(1040000, 30000, 1500000, 'PICKUP') });
    expect(totals.total).toBe(940000);
  });
});
