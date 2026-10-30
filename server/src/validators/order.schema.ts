import { DELIVERY_TIME_SLOTS } from '@ninicakes/shared';
import { z } from 'zod';

const addressSnapshot = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập tên người nhận').max(80),
  phone: z.string().trim().regex(/^0\d{8,10}$/, 'Số điện thoại chưa hợp lệ'),
  addressLine: z.string().trim().min(5, 'Vui lòng nhập địa chỉ chi tiết').max(200),
  ward: z.string().trim().max(60).optional().or(z.literal('')),
  district: z.string().trim().max(60).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Vui lòng nhập tỉnh/thành phố').max(60),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  mapsUrl: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
});

export const checkoutSchema = z
  .object({
    /** Bỏ trống = mua cả giỏ. Có giá trị = chỉ đặt những dòng giỏ hàng được chọn. */
    itemIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
    couponCode: z.string().trim().max(30).optional().or(z.literal('')),
    deliveryType: z.enum(['DELIVERY', 'PICKUP']),
    deliveryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Chọn ngày nhận/giao theo định dạng ngày'),
    timeSlot: z.string().trim().max(30).refine(
      (v) => (DELIVERY_TIME_SLOTS as readonly string[]).includes(v),
      'Vui lòng chọn khung giờ nhận hàng'
    ),
    paymentMethod: z.enum(['COD', 'BANK_TRANSFER']),
    addressId: z.number().int().positive().optional(),
    address: addressSnapshot.optional(),
    note: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryType === 'DELIVERY' && !data.addressId && !data.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['addressId'],
        message: 'Vui lòng chọn hoặc nhập địa chỉ giao hàng.',
      });
    }
  });

export const orderListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(12),
  status: z.string().trim().max(20).optional(),
  search: z.string().trim().max(60).optional(),
  deliveryType: z.string().trim().max(10).optional(),
  paymentMethod: z.string().trim().max(20).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']).optional(),
  deliveryDate: z.string().trim().max(10).optional(),
  from: z.string().trim().max(10).optional(),
  to: z.string().trim().max(10).optional(),
});

export const adminStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

export const paymentStatusSchema = z.object({
  paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
});
