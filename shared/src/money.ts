/** Định dạng số thành tiền Việt: 1.250.000 ₫ */
export function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

/** 1.250.000 (không ký hiệu) - dùng cho input */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
}

/** Parse "1.250.000" | "1250000" | "1,250" | "200,000.00" -> number
    VNĐ không có đơn vị xu, nên phần thập phân 1–2 chữ số cuối bị bỏ qua thay vì dính vào chuỗi số */
export function parseAmount(input: string): number {
  const cleaned = (input || '').replace(/[₫\s]/g, '').replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}
