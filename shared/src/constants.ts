/** Hằng số dùng chung cho cả hệ thống Nini Cakes */

export const ROLES = ['ADMIN', 'STAFF', 'CUSTOMER'] as const;
export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  'dashboard.view',
  'products.manage',
  'categories.manage',
  'catalog.manage',
  'orders.manage',
  'customers.view',
  'customers.manage',
  'coupons.manage',
  'reviews.manage',
  'content.manage',
  'reports.view',
  'staff.manage',
  'settings.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.view': 'Xem tổng quan',
  'products.manage': 'Quản lý sản phẩm',
  'categories.manage': 'Quản lý danh mục',
  'catalog.manage': 'Nguyên liệu & dị ứng',
  'orders.manage': 'Quản lý đơn hàng',
  'customers.view': 'Xem khách hàng',
  'customers.manage': 'Quản lý khách hàng',
  'coupons.manage': 'Quản lý khuyến mãi',
  'reviews.manage': 'Quản lý đánh giá',
  'content.manage': 'Quản lý nội dung',
  'reports.view': 'Xem & xuất báo cáo',
  'staff.manage': 'Quản lý nhân viên',
  'settings.manage': 'Cài đặt cửa hàng',
};

/** Khung giờ nhận bánh trong ngày */
export const DELIVERY_TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 21:30',
] as const;

/** Biến thể dưới ngưỡng này sẽ cảnh báo trên dashboard */
export const LOW_STOCK_THRESHOLD = 6;

/** Giăm tối đa của 1 dòng trong giỏ hàng */
export const MAX_CART_QUANTITY = 20;

/** Số ngày tối đa đặt trước */
export const MAX_PREORDER_DAYS = 45;

/** Sắp xếp sản phẩm khớp validate của server */
export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'popular', 'rating'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
