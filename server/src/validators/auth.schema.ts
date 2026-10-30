import { z } from 'zod';

const VN_PHONE = /^0\d{8,10}$/;
const PHONE_MSG = 'Số điện thoại dạng 0xxxxxxxxx (9-11 chữ số)';
/** Khách hàng chỉ cần mật khẩu 4 ký tự cho gọn; tài khoản quản trị vẫn giữ chuẩn 8. */
const MIN_CUSTOMER_PASSWORD = 4;
const PHONE_REQUIRED = 'Vui lòng nhập số điện thoại';
const phoneField = () => z.string({ required_error: PHONE_REQUIRED }).trim().regex(VN_PHONE, PHONE_MSG);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự').max(80),
  phone: phoneField(),
  password: z.string().min(MIN_CUSTOMER_PASSWORD, `Mật khẩu cần ít nhất ${MIN_CUSTOMER_PASSWORD} ký tự`).max(72),
});

/** Nhận diện bằng SĐT (khách hàng) hoặc email (quản trị viên/nhân viên) */
export const loginSchema = z
  .object({
    phone: z.string().trim().regex(VN_PHONE, PHONE_MSG).optional(),
    email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng').optional(),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  })
  .refine((v) => Boolean(v.phone || v.email), {
    message: PHONE_REQUIRED,
    path: ['phone'],
  });

export const forgotSchema = z.object({
  phone: phoneField(),
});

export const resetSchema = z.object({
  phone: phoneField(),
  code: z.string().trim().regex(/^\d{6}$/, 'Mã xác nhận gồm 6 chữ số'),
  password: z.string().min(MIN_CUSTOMER_PASSWORD, `Mật khẩu cần ít nhất ${MIN_CUSTOMER_PASSWORD} ký tự`).max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z
    .string()
    .min(MIN_CUSTOMER_PASSWORD, `Mật khẩu mới cần ít nhất ${MIN_CUSTOMER_PASSWORD} ký tự`)
    .max(72),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneField(),
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
