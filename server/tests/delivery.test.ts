import { describe, expect, it } from 'vitest';
import { DELIVERY_TIME_SLOTS, isSlotSelectable, slotUnavailableReason, slotStartHour, vnTodayISO } from '@ninicakes/shared';

/** 29/10/2026 12:00 giờ Việt Nam = 05:00 UTC — server chạy UTC không được hiểu là "quá khứ" */
const noonVN = new Date('2026-10-29T05:00:00Z');

describe('ngày & khung giờ nhận theo giờ Việt Nam', () => {
  it('vnTodayISO lấy đúng ngày Việt Nam cả khi UTC vẫn là hôm trước', () => {
    expect(vnTodayISO(new Date('2026-10-28T17:30:00Z'))).toBe('2026-10-29'); // 00:30 ngày 29 giờ VN
    expect(vnTodayISO(new Date('2026-10-29T16:30:00Z'))).toBe('2026-10-29'); // 23:30 ngày 29 giờ VN
  });

  it('đặt trong hôm nay vẫn được nếu khung giờ chưa trôi qua', () => {
    expect(slotUnavailableReason('2026-10-29', '20h-21h', noonVN)).toBeNull();
    expect(isSlotSelectable('2026-10-29', '13h-14h', noonVN)).toBe(true);
  });

  it('đặt trong hôm nay bị chặn khi khung giờ đã bắt đầu', () => {
    expect(isSlotSelectable('2026-10-29', '08h-09h', noonVN)).toBe(false);
    expect(isSlotSelectable('2026-10-29', '12h-13h', noonVN)).toBe(false);
    expect(slotUnavailableReason('2026-10-29', '08h-09h', noonVN)).toContain('đã trôi qua');
  });

  it('ngày hôm qua luôn bị từ chối', () => {
    expect(slotUnavailableReason('2026-10-28', '20h-21h', noonVN)).toContain('quá khứ');
  });

  it('ngày mai nhận mọi khung giờ', () => {
    for (const slot of DELIVERY_TIME_SLOTS) {
      expect(isSlotSelectable('2026-10-30', slot, noonVN)).toBe(true);
    }
  });

  it('định dạng khung giờ lạ bị từ chối, slotStartHour khớp giờ đầu', () => {
    expect(slotUnavailableReason('2026-10-30', '08:00 - 10:00', noonVN)).toContain('chưa hợp lệ');
    expect(slotStartHour('17h-18h')).toBe(17);
  });
});
