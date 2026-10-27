import { describe, expect, it } from 'vitest';
import { canTransition, ORDER_STATUS_LABEL, terminalStatuses } from '@ninicakes/shared';

/** Quy tắc hủy đơn: khách chỉ được tự hủy khi đơn còn PENDING / CONFIRMED */
const CUSTOM_CANCELABLE: string[] = ['PENDING', 'CONFIRMED'];

describe('State machine đơn hàng (order-flow)', () => {
  it('mọi trạng thái đều có nhãn tiếng Việt đầy đủ', () => {
    const list = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    for (const status of list) {
      expect(ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL]).toBeTruthy();
    }
  });

  it('hành trình làm bánh đến giao hàng là đường duy nhất tới COMPLETED', () => {
    const path = 'PENDING>CONFIRMED>PREPARING>READY>SHIPPED>COMPLETED'.split('>');
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i] as never, path[i + 1] as never)).toBe(true);
    }
  });

  it('hủy được phép từ mọi trạng thái đang làm, trừ COMPLETED/CANCELLED', () => {
    for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED']) {
      expect(canTransition(status as never, 'CANCELLED')).toBe(true);
    }
    expect(terminalStatuses().sort()).toEqual(['CANCELLED', 'COMPLETED']);
  });

  it('khách chỉ tự hủy được khi đơn còn ở PENDING / CONFIRMED', () => {
    for (const s of CUSTOM_CANCELABLE) expect(canTransition(s as never, 'CANCELLED')).toBe(true);
    // Khi bánh đang làm, yêu cầu khách liên hệ tiệm (không còn tự hủy theo state machine công khai này)
    expect(canTransition('PREPARING' as never, 'CANCELLED')).toBe(true);
    expect(canTransition('READY' as never, 'CONFIRMED')).toBe(false);
  });
});
