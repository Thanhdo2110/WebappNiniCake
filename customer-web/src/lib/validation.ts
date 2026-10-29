/** Schema kiểm tra đầu vào dùng chung — thông báo tiếng Việt, khớp luật phía server */
import { z } from 'zod';

export const VN_PHONE_REGEX = /^0\d{8,10}$/;

/* ---------- Địa chỉ (khớp addressSchema của server) ---------- */
export const addressFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập tên người nhận').max(80),
  phone: z.string().trim().regex(VN_PHONE_REGEX, 'Số điện thoại chưa hợp lệ (VD: 0901234567)'),
  addressLine: z.string().trim().min(5, 'Vui lòng nhập địa chỉ chi tiết').max(200),
  ward: z.string().trim().max(60).optional().or(z.literal('')),
  district: z.string().trim().max(60).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Vui lòng nhập tỉnh/thành phố').max(60),
});
export type AddressForm = z.infer<typeof addressFormSchema>;
export const ADDRESS_FIELD_ORDER: Array<keyof AddressForm> = ['fullName', 'phone', 'addressLine', 'ward', 'district', 'city'];

/* ---------- Đăng nhập / đăng ký / mật khẩu ---------- */
/** Khách hàng chỉ cần mật khẩu từ 4 ký tự; luật này khớp với server */
export const MIN_PASSWORD = 4;
export const MIN_PASSWORD_MSG = `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự`;

/** Khách hàng đăng nhập bằng số điện thoại */
export const loginSchema = z.object({
  phone: z.string().trim().regex(VN_PHONE_REGEX, 'Vui lòng nhập số điện thoại (VD: 0901234567)'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên của bạn').max(80),
    phone: z.string().trim().regex(VN_PHONE_REGEX, 'Số điện thoại chưa hợp lệ (VD: 0901234567)'),
    password: z.string().min(MIN_PASSWORD, MIN_PASSWORD_MSG),
    confirmPassword: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: 'Vui lòng đồng ý với điều khoản của tiệm' }) }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Mật khẩu nhập lại chưa khớp',
    path: ['confirmPassword'],
  });
export type RegisterForm = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({
  phone: z.string().trim().regex(VN_PHONE_REGEX, 'Vui lòng nhập số điện thoại (VD: 0901234567)'),
});
export type ForgotForm = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    phone: z.string().trim().regex(VN_PHONE_REGEX, 'Vui lòng nhập số điện thoại (VD: 0901234567)'),
    code: z.string().trim().regex(/^\d{6}$/, 'Mã gồm 6 chữ số'),
    newPassword: z.string().min(MIN_PASSWORD, MIN_PASSWORD_MSG),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại chưa khớp',
    path: ['confirmPassword'],
  });
export type ResetForm = z.infer<typeof resetSchema>;

/* ---------- Liên hệ ---------- */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng cho tiệm biết tên bạn').max(80),
  email: z.string().trim().email('Email chưa đúng định dạng'),
  phone: z.string().trim().regex(VN_PHONE_REGEX, 'Số điện thoại chưa hợp lệ').optional().or(z.literal('')),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  content: z.string().trim().min(10, 'Nội dung cần ít nhất 10 ký tự để tiệm hiểu rõ yêu cầu').max(3000),
});
export type ContactForm = z.infer<typeof contactSchema>;

/** Cuộn + focus vào trường đầu tiên có lỗi trong form */
export function focusFirstError(names: string[], errors: Record<string, unknown>): void {
  const name = names.find((k) => errors[k]);
  if (!name) return;
  const el = document.querySelector<HTMLElement>(`[name="${name}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => el?.focus({ preventScroll: true }), 320);
}
