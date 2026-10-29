/** Trạng thái đơn */
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang làm bánh',
  READY: 'Sẵn sàng',
  SHIPPED: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: '#C9A96E',
  CONFIRMED: '#A9B8A0',
  PREPARING: '#D19A6A',
  READY: '#7FA98C',
  SHIPPED: '#8FA6B8',
  COMPLETED: '#5F8D5C',
  CANCELLED: '#B86A6A',
};

/** Luồng chuyển trạng thái hợp lệ. PICKUP: READY -> COMPLETED (KHÔNG qua SHIPPED). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'COMPLETED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function terminalStatuses(): OrderStatus[] {
  return ['COMPLETED', 'CANCELLED'];
}

export type DeliveryType = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'COD' | 'BANK_TRANSFER';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';
export type CouponType = 'PERCENT' | 'AMOUNT';

export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  DELIVERY: 'Giao tận nơi',
  PICKUP: 'Nhận tại tiệm',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận (COD)',
  BANK_TRANSFER: 'Chuyển khoản / QR',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};

/** Đơn chuyển khoản còn chờ tiền: bếp chưa thấy đơn, khách cần trả tiếp */
export const isAwaitingPayment = (o: { status: string; paymentStatus: string; paymentMethod: string }) =>
  o.status === 'PENDING' && o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'UNPAID';
