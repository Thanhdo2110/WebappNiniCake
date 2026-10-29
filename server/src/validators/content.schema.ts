import { z } from 'zod';
import { envs } from '../config/env.js';

export const bannerBodySchema = z.object({
  title: z.string().trim().min(2, 'Nhập tiêu đề banner').max(120),
  subtitle: z.string().trim().max(200).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  linkUrl: z.string().trim().max(300).optional().or(z.literal('')).nullable(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const postBodySchema = z.object({
  title: z.string().trim().min(2, 'Nhập tiêu đề').max(160),
  slug: z.string().trim().max(160).optional().or(z.literal('')),
  excerpt: z.string().trim().max(300).optional().or(z.literal('')),
  content: z.string().trim().min(10, 'Nội dung cần ít nhất 10 ký tự').max(20000),
  coverImageUrl: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  type: z.enum(['STORY', 'POLICY', 'FAQ']).default('STORY'),
  isPublished: z.boolean().optional().default(false),
});

export const settingsBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slogan: z.string().trim().max(200).optional().or(z.literal('')),
  address: z.string().trim().min(5).max(200),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(120),
  openingHours: z.string().trim().min(3).max(120),
  facebook: z.string().trim().max(200).optional().or(z.literal('')),
  instagram: z.string().trim().max(200).optional().or(z.literal('')),
  zalo: z.string().trim().max(20).optional().or(z.literal('')),
  bankName: z.string().trim().min(3).max(120),
  bankAccountName: z.string().trim().min(3).max(120),
  bankAccountNumber: z.string().trim().min(6).max(30),
  shippingFeeVnd: z.number().int().min(0).max(500000),
  freeShippingMinVnd: z.number().int().min(0).max(100000000),
});

/* Ảnh đính kèm phải là tệp do chính hệ thống lưu, không phải URL tuỳ ý:
   khách chỉ gửi về từ POST /uploads/attach. Tên tệp sinh ra dạng
   "<timestamp>-<uuid8>.<ext>" nên không có dấu '/' — chặn luôn đường dẫn cha. */
const contactImage =
  envs.upload.driver === 'cloudinary'
    ? z.string().trim().regex(/^https:\/\/res\.cloudinary\.com\//, 'Ảnh đính kèm không hợp lệ')
    : z.string().trim().regex(/^\/uploads\/images\/[\w-]+(\.[\w-]+)?$/, 'Ảnh đính kèm không hợp lệ');

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng cho biết tên của bạn').max(80),
  email: z.string().trim().email('Email chưa đúng định dạng'),
  phone: z.string().trim().max(15).optional().or(z.literal('')),
  subject: z.string().trim().max(120).optional().or(z.literal('')),
  content: z.string().trim().min(10, 'Vui lòng mô tả chi tiết hơn').max(2000),
  imageUrl: contactImage.max(500).optional().or(z.literal('')),
});

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng'),
});
