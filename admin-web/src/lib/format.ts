/** Tiện ích định dạng hiển thị của admin */
import { formatVND, formatNumber, parseAmount } from '@shared/money';

export { formatVND, formatNumber, parseAmount };

/** Bỏ chấm nhóm nghìn để dựng chuỗi đang gõ ('5.500.000' -> '5500000') */
export function unformatMoney(input: string): string {
  return (input || '').replace(/\D+/g, '');
}

/** Ô nhập tiền: chỉ giữ chữ số, bỏ số 0 dư đầu, chấm mỗi nghìn — KHÔNG cắt bớt số
    (giới hạn max ở phía server bằng lỗi rõ ràng, không âm thầm chặn khi gõ).
    '12a5000' -> '125.000'; '9000' -> '9.000'; '0' -> '0' */
export function toMoneyText(input: string): string {
  const digits = (input || '').replace(/\D+/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Vị trí con trỏ đứng ngay sau N chữ số trong chuỗi đã chấm: ('45.000', n=3) -> 5 */
export function caretAfterMoneyDigits(formatted: string, digitsBefore: number): number {
  if (!Number.isFinite(digitsBefore) || digitsBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[0-9]/.test(formatted[i])) {
      seen++;
      if (seen === digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('vi-VN');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
