import { z } from 'zod';
import { moneyInt } from './common.schema.js';

export const couponBodySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, 'Mã gồm lớn hơn 3 ký tự: A-Z, 0-9, _ hoặc -'),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  type: z.enum(['PERCENT', 'AMOUNT']),
  value: moneyInt, // PERCENT: phầm trăm 1-100, AMOUNT: số tiền VND
  minSubtotal: moneyInt.optional().default(0),
  maxDiscount: moneyInt.optional().nullable(),
  maxUses: z.number().int().min(1).max(100000).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CouponBody = z.infer<typeof couponBodySchema>;

export const couponValidateSchema = z.object({
  code: z.string().trim().min(2, 'Nhập mã giảm giá').max(30).toUpperCase(),
  subtotal: z.coerce.number().int('Giỏ hàng chưa hợp lệ').min(0).default(0),
});
