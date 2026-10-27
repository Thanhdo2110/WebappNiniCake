import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự').max(80),
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng'),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,10}$/, 'Số điện thoại dạng 0xxxxxxxxx (9-11 chữ số)')
    .optional(),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng'),
});

export const resetSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng'),
  code: z.string().trim().regex(/^\d{6}$/, 'Mã xác nhận gồm 6 chữ số'),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới cần ít nhất 8 ký tự').max(72),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^0\d{8,10}$/).optional().or(z.literal('')),
  avatarUrl: z.string().trim().url().max(500).optional().or(z.literal('')).nullable(),
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập tên người nhận').max(80),
  phone: z.string().trim().regex(/^0\d{8,10}$/, 'Số điện thoại chưa hợp lệ'),
  addressLine: z.string().trim().min(5, 'Vui lòng nhập địa chỉ chi tiết').max(200),
  ward: z.string().trim().max(60).optional().or(z.literal('')),
  district: z.string().trim().max(60).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Vui lòng nhập tỉnh/thành phố').max(60),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  mapsUrl: z.string().trim().url('Link Google Maps chưa hợp lệ').max(500).optional().or(z.literal('')).nullable(),
  isDefault: z.boolean().optional().default(false),
});

export const staffCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(72),
  role: z.enum(['STAFF', 'ADMIN']),
});

export const roleParamSchema = z.object({
  role: z.enum(['STAFF', 'CUSTOMER']),
});
