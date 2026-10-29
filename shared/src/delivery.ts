/** Ngày & khung giờ nhận bánh — luôn quy chiếu giờ Việt Nam (UTC+7, không có giờ mùa hè) */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const VN_OFFSET_MS = 7 * HOUR_MS;

/** Nửa đêm hôm nay theo giờ VN, tính theo epoch */
export function vnTodayStart(now = new Date()): number {
  return Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
}

/** yyyy-MM-DD hôm nay theo giờ VN */
export function vnTodayISO(now = new Date()): string {
  return new Date(vnTodayStart(now) + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** 'yyyy-MM-DD' -> thời điểm 00:00 giờ VN của ngày đó, tính theo epoch */
export function vnDayStart(dateStr: string): number {
  const parsed = Date.parse(`${dateStr}T00:00:00Z`);
  return Number.isNaN(parsed) ? NaN : parsed - VN_OFFSET_MS;
}

/** '17h-18h' -> 17 */
export function slotStartHour(slot: string): number {
  const m = /^(\d{1,2})h-(\d{1,2})h$/.exec(slot);
  return m ? Number(m[1]) : NaN;
}

/** Lý do từ chối (tiếng Việt), hoặc null nếu khung giờ này vẫn nhận được */
export function slotUnavailableReason(dateStr: string, slot: string, now = new Date()): string | null {
  const dayStart = vnDayStart(dateStr);
  if (Number.isNaN(dayStart)) return 'Ngày nhận/giao chưa hợp lệ.';
  const todayStart = vnTodayStart(now);
  if (dayStart < todayStart) return 'Không thể chọn ngày trong quá khứ. Kính mời quý khách chọn ngày khác.';
  const startHour = slotStartHour(slot);
  if (Number.isNaN(startHour)) return 'Khung giờ nhận hàng chưa hợp lệ.';
  if (dayStart === todayStart && dayStart + startHour * HOUR_MS <= now.getTime()) {
    return `Khung ${slot} hôm nay đã trôi qua, quý khách chọn khung giờ muộn hơn nhé.`;
  }
  return null;
}

/** Kiểm tra nhanh cho UI: khung này còn chọn được không */
export function isSlotSelectable(dateStr: string, slot: string, now = new Date()): boolean {
  return slotUnavailableReason(dateStr, slot, now) === null;
}

/** Khung đầu tiên (trong danh sách đã lọc) còn nhận được của một ngày */
export function firstSelectableSlot<T extends string>(
  slots: readonly T[],
  dateStr: string,
  now = new Date()
): T | null {
  return slots.find((s) => isSlotSelectable(dateStr, s, now)) ?? null;
}
