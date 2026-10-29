/** DTO dùng chung giữa server và 2 frontend (customer-web, admin-web) */
import type { OrderStatus, DeliveryType, PaymentMethod, PaymentStatus } from './order-status';

/* ============ Bao bọc phản hồi ============ */
export interface PaginationMeta {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiErrorBody;

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/* ============ Tài khoản ============ */
export interface PublicUserDTO {
  id: number;
  /** Khách hàng đăng ký bằng SĐT nên để trống; tài khoản quản trị luôn có email. */
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  status: 'ACTIVE' | 'BLOCKED';
}

export interface ProfileStatsDTO {
  orderCount: number;
  totalSpent: number;
}

export interface AddressDTO {
  id: number;
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  fullName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  isDefault?: boolean;
}

export interface WishlistItemDTO {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  shortDescription: string | null;
  isActive: boolean;
  ratingAvg: number;
  ratingCount: number;
  imageUrl: string | null;
}

/* ============ Sản phẩm ============ */
export interface ProductVariantDTO {
  id: number;
  productId: number;
  name: string;
  flavor: string | null;
  price: number;
  sku: string | null;
  isActive: boolean;
}

export interface ProductImageDTO {
  id: number;
  url: string | null;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductListDTO {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  categoryId: number;
  categoryName?: string | null;
  price: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  isSeasonal: boolean;
  isActive: boolean;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  imageUrl: string | null;
  createdAt: string;
}

export interface ProductDetailDTO extends Omit<ProductListDTO, 'createdAt'> {
  description: string | null;
  images: ProductImageDTO[];
  variants: ProductVariantDTO[];
  ingredients: number[];
  allergens: number[];
}

export interface CategoryDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
}

export interface IngredientDTO {
  id: number;
  name: string;
  note: string | null;
  allergenIds: number[];
}

export interface AllergenDTO {
  id: number;
  name: string;
  icon: string | null;
}

export interface ReviewDTO {
  id: number;
  rating: number;
  comment: string;
  imageUrl: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: { id: number; fullName: string };
}

export interface ProductReviewsDTO {
  items: ReviewDTO[];
  meta: PaginationMeta;
  avgRating: number;
  totalCount: number;
}

export interface ProductDetailPageDTO {
  product: ProductDetailDTO;
  related: ProductListDTO[];
  reviews: ProductReviewsDTO;
}

/* ============ Giỏ hàng ============ */
export interface CartItemOptionsDTO {
  messageOnCake?: string;
  notes?: string;
  referenceImageUrl?: string | null;
}

export interface CartItemDTO {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string | null;
  variantName: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: CartItemOptionsDTO | null;
}

export interface CartSummaryDTO {
  items: CartItemDTO[];
  subtotal: number;
}

export interface AddCartItemInput {
  variantId: number;
  quantity: number;
  options?: {
    messageOnCake?: string;
    notes?: string;
    referenceImageUrl?: string;
  };
}

/* ============ Đơn hàng ============ */
export interface OrderItemDTO {
  id: number;
  productId: number | null;
  variantId: number | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: Record<string, unknown> | null;
}

export interface OrderStatusHistoryDTO {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  changedBy: { id: number; fullName: string } | null;
}

export interface OrderUserBrief {
  id: number;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
}

export interface OrderDTO {
  id: number;
  code: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryDate: string;
  timeSlot: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  note: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cancelReason: string | null;
  items: OrderItemDTO[];
  history: OrderStatusHistoryDTO[];
  user?: OrderUserBrief | undefined;
  createdAt: string;
}

export interface CheckoutAddressInput {
  fullName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
}

export interface CheckoutInput {
  couponCode?: string;
  deliveryType: DeliveryType;
  deliveryDate: string;
  timeSlot: string;
  paymentMethod: PaymentMethod;
  addressId?: number;
  address?: CheckoutAddressInput;
  note?: string;
}

export interface RecentOrderDTO {
  id: number;
  code: string;
  status: OrderStatus;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryDate: string;
  timeSlot: string;
  recipientName: string;
  recipientPhone: string;
  createdAt: string;
  customerEmail?: string;
}

/* ============ Đánh giá bài ============ */
export interface CouponValidationDTO {
  valid: boolean;
  discount: number;
  reason?: string;
}

/* ============ Nội dung / cài đặt ============ */
export interface BannerDTO {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PostSummaryDTO {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  type: 'STORY' | 'POLICY' | 'FAQ';
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface PostDetailDTO extends PostSummaryDTO {
  content: string;
}

export interface StoreSettingsDTO {
  name: string;
  slogan: string | null;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  facebook: string | null;
  instagram: string | null;
  zalo: string | null;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  shippingFeeVnd: number;
  freeShippingMinVnd: number;
  payosEnabled?: boolean;
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  content: string;
  imageUrl?: string;
}

export interface MessageDTO {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  content: string;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

/* ============ Báo cáo / dashboard ============ */
export interface RevenuePointDTO {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProductDTO {
  productId: number;
  name: string;
  qty: number;
  revenue: number;
}

export interface DashboardDTO {
  revenueToday: number;
  revenueMonth: number;
  ordersNewToday: number;
  ordersPending: number;
  reviewsPending: number;
  messagesUnread: number;
  customersNewMonth: number;
  topProducts: TopProductDTO[];
  recentOrders: RecentOrderDTO[];
  revenueSeries: RevenuePointDTO[];
}

export interface RevenueSummaryDTO {
  revenue: number;
  orders: number;
  from: string;
  to: string;
}

/* ============ Trang chủ ============ */
export interface HomeDTO {
  banners: BannerDTO[];
  categories: CategoryDTO[];
  featured: ProductListDTO[];
  seasonal: ProductListDTO[];
  bestsellers: ProductListDTO[];
  topReviews: Array<ReviewDTO & { product: { id: number; name: string; slug: string } }>;
  settings: StoreSettingsDTO;
}

/* ============ Quản trị sản phẩm ============ */
export type AdminProductRow = ProductListDTO;

/** Danh mục hiển thị ở dropdown admin (kèm số lượng bánh) */
export interface CategoryAdminDTO extends CategoryDTO {
  sortOrder: number;
}

export interface CouponAdminDTO {
  id: number;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}
