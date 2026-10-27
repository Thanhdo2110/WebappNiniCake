import { z } from 'zod';

export const cartAddSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20, 'Mỗi loại bánh tối đa 20 phần/lần'),
  options: z
    .object({
      messageOnCake: z.string().trim().max(60, 'Lời chúc trên bánh tối đa 60 ký tự').optional().or(z.literal('')),
      notes: z.string().trim().max(500).optional().or(z.literal('')),
      referenceImageUrl: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
    })
    .optional(),
});

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(1).max(20, 'Mỗi loại bánh tối đa 20 phần/lần'),
});
