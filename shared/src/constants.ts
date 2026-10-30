/** Hằng số dùng chung cho cả hệ thống Nini Cakes */

export const ROLES = ['ADMIN', 'STAFF', 'CUSTOMER'] as const;
export type RoleName = (typeof ROLES)[number];

/** Khung giờ nhận bánh trong ngày — mỗi khung 1 giờ, từ 8h đến 21h */
export const DELIVERY_TIME_SLOTS = [
  '08h-09h',
  '09h-10h',
  '10h-11h',
  '11h-12h',
  '12h-13h',
  '13h-14h',
  '14h-15h',
  '15h-16h',
  '16h-17h',
  '17h-18h',
  '18h-19h',
  '19h-20h',
  '20h-21h',
] as const;

/** Giăm tối đa của 1 dòng trong giỏ hàng */
export const MAX_CART_QUANTITY = 20;

/** Sắp xếp sản phẩm khớp validate của server */
export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'popular', 'rating'] as const;
