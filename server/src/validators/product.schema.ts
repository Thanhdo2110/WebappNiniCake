import { z } from 'zod';
import { moneyInt } from './common.schema.js';

export const variantInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, 'Nhập tên kích cỡ/biến thể').max(80),
  flavor: z.string().trim().max(80).optional().or(z.literal('')),
  price: moneyInt,
  isActive: z.boolean().optional().default(true),
});

export const productImageInput = z.object({
  id: z.number().int().positive().optional(),
  url: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  alt: z.string().trim().max(150).optional().or(z.literal('')).nullable(),
  isPrimary: z.boolean().optional().default(false),
});

export const productBodySchema = z.object({
  categoryId: z.number().int().positive('Chọn danh mục'),
  name: z.string().trim().min(2, 'Nhập tên sản phẩm').max(120),
  shortDescription: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  compareAtPrice: moneyInt.optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isSeasonal: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  variants: z.array(variantInput).min(1, 'Sản phẩm cần ít nhất 1 biến thể').max(10),
  images: z.array(productImageInput).max(8).optional().default([]),
  ingredientIds: z.array(z.number().int().positive()).max(40).optional().default([]),
  allergenIds: z.array(z.number().int().positive()).max(10).optional().default([]),
});

export const productListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  ingredientIds: z.string().optional(),
  excludeAllergenIds: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  seasonal: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).default('newest'),
});

export const categoryBodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const ingredientBodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  note: z.string().trim().max(200).optional().or(z.literal('')),
  allergenIds: z.array(z.number().int().positive()).max(10).optional().default([]),
});

export const allergenBodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(10).optional().or(z.literal('')),
});

export type ProductBody = z.infer<typeof productBodySchema>;
export type VariantInput = z.infer<typeof variantInput>;
export type ProductImageInput = z.infer<typeof productImageInput>;
export type ProductListQuery = z.infer<typeof productListQuery>;
