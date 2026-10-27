import { couponRepository as repo } from '../repositories/coupon.repository.js';
import { evalCoupon } from '../utils/totals.js';
import { fail } from '../utils/http.js';
import type { CouponBody } from '../validators/coupon.schema.js';
import { buildMeta } from '../utils/pagination.js';

export const couponService = {
  /** Kiểm tra & tính giá trị mã cho giỏ hiện tại */
  async validate(code: string, subtotal: number) {
    const coupon = await repo.findByCode(code);
    const now = new Date();
    if (!coupon) throw fail('Mã giảm giá không tồn tại.', 404);
    if (!coupon.isActive) throw fail('Mã giảm giá đã ngừng áp dụng.', 409);
    if (coupon.startsAt && coupon.startsAt > now) throw fail('Mã giảm giá chưa mở áp dụng.', 409);
    if (coupon.endsAt && coupon.endsAt < now) throw fail('Mã giảm giá đã hết hạn.', 409);
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw fail('Mã giảm giá đã kết gắng hết lượt sử dụng trong đợt này.', 409);
    }
    if (subtotal < coupon.minSubtotal) {
      throw fail(
        `Đơn cần tối thiểu ${coupon.minSubtotal.toLocaleString('vi-VN')}đ để dùng mã ${coupon.code}.`,
        409
      );
    }
    const calc = evalCoupon(coupon, subtotal, now);
    return {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: calc.discount,
      description: coupon.description,
    };
  },

  async adminList(page: number, perPage: number) {
    const [items, total] = await repo.list(page, perPage);
    return { items, meta: buildMeta(total, page, perPage) };
  },
  async adminCreate(body: CouponBody) {
    if (body.type === 'PERCENT' && body.value > 100) {
      throw fail('Phần trăm giảm giá tối đa là 100%.', 400);
    }
    const dup = await repo.findByCode(body.code);
    if (dup) throw fail('Mã này đang tồn tại. Vui lòng chọn mã khác.', 409);
    const data = {
      code: body.code,
      description: body.description || null,
      type: body.type,
      value: body.value,
      minSubtotal: body.minSubtotal ?? 0,
      maxDiscount: body.type === 'PERCENT' ? body.maxDiscount ?? null : null,
      maxUses: body.maxUses ?? null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      isActive: body.isActive ?? true,
    };
    return repo.create(data);
  },
  async adminUpdate(id: number, body: Partial<CouponBody>) {
    const existing = await repo.getById(id);
    if (!existing) throw fail('Mã giảm giá không tồn tại.', 404);
    if (body.type === 'PERCENT' && body.value !== undefined && body.value > 100) {
      throw fail('Phần trăm giảm giá tối đa là 100%.', 400);
    }
    const data: Record<string, unknown> = {};
    if (body.code && body.code !== existing.code) {
      const dup = await repo.findByCode(body.code);
      if (dup) throw fail('Mã này đang tồn tại. Vui lòng chọn mã khác.', 409);
      data.code = body.code;
    }
    for (const key of ['description', 'type', 'value', 'minSubtotal', 'maxDiscount', 'maxUses', 'isActive'] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    return repo.update(id, data);
  },
  async adminDelete(id: number) {
    const existing = await repo.getById(id);
    if (!existing) throw fail('Mã giảm giá không tồn tại.', 404);
    await repo.softDelete(id);
    return { id };
  },
};
