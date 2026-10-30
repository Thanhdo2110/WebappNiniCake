import { z } from 'zod';

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const productIdParam = z.object({ productId: z.coerce.number().int().positive() });
export const slugParam = z.object({ slug: z.string().min(1).max(120) });
export const roleParam = z.object({
  role: z.preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z.enum(['ADMIN', 'STAFF', 'CUSTOMER'], { errorMap: () => ({ message: 'Vai trò không hợp lệ.' }) })
  ),
});

export const moneyInt = z.number().int().min(0).max(1000000000);
