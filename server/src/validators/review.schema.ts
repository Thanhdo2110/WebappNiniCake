import { z } from 'zod';

export const reviewCreateSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1, 'Vui lòng chọn số sao từ 1~5').max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
});

export const reviewReplySchema = z.object({
  reply: z.string().trim().min(2, 'Nội dung phản hồi cần ít nhất 2 ký tự').max(600),
});
