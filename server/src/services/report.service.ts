import { prisma } from '../config/prisma.js';
import { orderRepository as orderRepo } from '../repositories/order.repository.js';
import { toCsv } from '../utils/csv.js';
import { formatVND } from '@ninicakes/shared';
import { Prisma } from '@prisma/client';
import type { RevenuePointDTO, TopProductDTO } from '@ninicakes/shared';

export type Granularity = 'day' | 'week' | 'month';

function startOfDayAdd(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function weekLabel(d: Date): string {
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);
  return `T${week} / ${d.getFullYear()}`;
}

function labelFor(d: Date, g: Granularity): string {
  if (g === 'day') return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  if (g === 'month') return d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
  return weekLabel(d);
}

function bucketKey(d: Date, g: Granularity): string {
  if (g === 'day') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (g === 'month') return `${d.getFullYear()}-${d.getMonth()}`;
  if (g === 'week') {
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString().slice(0, 10);
  }
  return '';
}

export const reportService = {
  async dashboard() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last14 = startOfDayAdd(-13);

    const [revToday, revMonth, ordersNewToday, ordersPending, reviewsPending, messagesUnread, customersMonth, recent, completed] =
      await prisma.$transaction([
        prisma.order.aggregate({
          where: { createdAt: { gte: todayStart }, deletedAt: null },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { createdAt: { gte: monthStart }, deletedAt: null },
          _sum: { total: true },
        }),
        prisma.order.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
        prisma.order.count({
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] },
            deletedAt: null,
            /* đơn chuyển khoản còn chờ tiền thì chưa tính là đơn cần xử lý */
            NOT: { paymentMethod: 'BANK_TRANSFER', paymentStatus: 'UNPAID' },
          },
        }),
        prisma.review.count({ where: { isApproved: false, deletedAt: null } }),
        prisma.message.count({ where: { isRead: false } }),
        prisma.user.count({ where: { createdAt: { gte: monthStart }, deletedAt: null, role: { name: 'CUSTOMER' } } }),
        prisma.order.findMany({
          where: {
            deletedAt: null,
            NOT: { paymentMethod: 'BANK_TRANSFER', paymentStatus: 'UNPAID' },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            items: true,
            user: { select: { id: true, email: true, fullName: true, phone: true } },
          },
        }),
        prisma.order.findMany({
          where: { deletedAt: null, createdAt: { gte: last14 } },
          select: { createdAt: true, total: true },
        }),
      ]);
    const topProducts = await this.topProductsRaw(new Date(now.getTime() - 30 * 24 * 3600 * 1000), now, 6);

    const series = new Map<string, RevenuePointDTO>();
    for (let i = 13; i >= 0; i--) {
      const d = startOfDayAdd(-i);
      const label = labelFor(d, 'day');
      series.set(label, { label, revenue: 0, orders: 0 });
    }
    for (const o of completed) {
      const label = labelFor(o.createdAt, 'day');
      const point = series.get(label);
      if (point) {
        point.revenue += o.total;
        point.orders += 1;
      }
    }

    return {
      revenueToday: revToday._sum.total || 0,
      revenueMonth: revMonth._sum.total || 0,
      ordersNewToday,
      ordersPending,
      reviewsPending,
      messagesUnread,
      customersNewMonth: customersMonth,
      topProducts,
      recentOrders: recent.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status as never,
        total: o.total,
        paymentMethod: o.paymentMethod as never,
        paymentStatus: o.paymentStatus as never,
        deliveryDate: o.deliveryDate.toISOString(),
        timeSlot: o.timeSlot,
        recipientName: o.recipientName,
        recipientPhone: o.recipientPhone,
        createdAt: o.createdAt.toISOString(),
        customerEmail: o.user?.email,
      })),
      revenueSeries: [...series.values()],
    };
  },

  topProductsRaw(from: Date, to: Date, limit: number): Promise<TopProductDTO[]> {
    return this.topProductsRows(from, to, limit).then((rows) =>
      rows.map((r) => ({
        productId: Number(r.productId),
        name: String(r.name),
        qty: Number(r.qty),
        revenue: Number(r.revenue),
      }))
    );
  },

  topProductsRows(from: Date, to: Date, limit: number) {
    return prisma.$queryRaw<{ productId: bigint | number; name: string; qty: bigint | number; revenue: bigint | number }[]>(
      Prisma.sql`SELECT oi.productId AS productId, oi.name AS name,
        SUM(oi.quantity) AS qty, SUM(oi.lineTotal) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.orderId
        WHERE o.deletedAt IS NULL AND oi.productId IS NOT NULL
          AND o.createdAt BETWEEN ${from.toISOString().slice(0, 19).replace('T', ' ')} AND ${to.toISOString().slice(0, 19).replace('T', ' ')}
        GROUP BY oi.productId, oi.name
        ORDER BY qty DESC
        LIMIT ${limit}`
    );
  },

  async revenueSeries(fromStr: string, toStr: string, g: Granularity) {
    const from = new Date(`${fromStr}T00:00:00+07:00`);
    const to = new Date(`${toStr}T23:59:59+07:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new Error('Chon sai khoảng thời gian');
    }
    const orders = await prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, RevenuePointDTO>();
    const cursor = new Date(from);
    while (cursor <= to) {
      const label = labelFor(cursor, g);
      map.set(bucketKey(cursor, g), { label, revenue: 0, orders: 0 });
      if (g === 'day') cursor.setDate(cursor.getDate() + 1);
      else if (g === 'week') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    let revenue = 0;
    const orderCount = orders.length;
    for (const o of orders) {
      const key = bucketKey(o.createdAt, g);
      const point = map.get(key);
      if (point) {
        point.revenue += o.total;
        point.orders += 1;
      }
      revenue += o.total;
    }
    return { series: [...map.values()], summary: { revenue, orders: orderCount, from: fromStr, to: toStr } };
  },

  async customersSeries(fromStr: string, toStr: string, g: Granularity) {
    const from = new Date(`${fromStr}T00:00:00+07:00`);
    const to = new Date(`${toStr}T23:59:59+07:00`);
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: from, lte: to }, deletedAt: null, role: { name: 'CUSTOMER' } },
      select: { createdAt: true },
    });
    const map = new Map<string, { label: string; count: number }>();
    const cursor = new Date(from);
    while (cursor <= to) {
      const label = labelFor(cursor, g);
      map.set(bucketKey(cursor, g), { label, count: 0 });
      if (g === 'day') cursor.setDate(cursor.getDate() + 1);
      else if (g === 'week') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const u of users) {
      const point = map.get(bucketKey(u.createdAt, g));
      if (point) point.count += 1;
    }
    return { series: [...map.values()], count: users.length };
  },

  /* ============ Export CSV ============ */
  async revenueCsv(fromStr: string, toStr: string, g: Granularity) {
    const { series, summary } = await this.revenueSeries(fromStr, toStr, g);
    const rows = series.map((p) => [p.label, p.revenue.toLocaleString('vi-VN'), p.orders]);
    rows.push(['TỔNG', summary.revenue.toLocaleString('vi-VN'), summary.orders]);
    return toCsv([`Kỳ ${fromStr} → ${toStr}`, 'Khoảng', 'Doanh thu (VND)', 'Số đơn'], rows);
  },

  async topProductsCsv(fromStr: string, toStr: string, limit = 50): Promise<string> {
    const from = new Date(`${fromStr}T00:00:00+07:00`);
    const to = new Date(`${toStr}T23:59:59+07:00`);
    const rows = await this.topProductsRaw(from, to, limit);
    return toCsv(
      [`Sản phẩm bán chạy ${fromStr} → ${toStr}`, 'STT', 'Sản phẩm', 'Số phần bán', 'Doanh thu (VND)'],
      rows.map((r, i) => [i + 1, r.name, r.qty, r.revenue.toLocaleString('vi-VN')])
    );
  },

  async ordersCsv(fromStr: string, toStr: string) {
    const { items, total } = await orderRepo.listAdmin({
      page: 1,
      perPage: 5000,
      from: fromStr,
      to: toStr,
    });
    void total;
    return toCsv(
      ['Mã đơn', 'Khách hàng', 'SĐT', 'Trạng thái', 'Nhận hàng', 'Ngày nhận', 'Khung giờ', 'Tổng tiền (VND)', 'Thanh toán'],
      items.map((o) => [
        o.code,
        o.recipientName,
        o.recipientPhone,
        o.status,
        o.deliveryType === 'DELIVERY' ? 'Giao tận nơi' : 'Nhận tại tiệm',
        o.deliveryDate.toISOString().slice(0, 10),
        o.timeSlot,
        o.total.toLocaleString('vi-VN'),
        o.paymentStatus === 'PAID' ? 'Đã thanh toán' : o.paymentStatus === 'REFUNDED' ? 'Đã hoàn tiền' : 'Chưa thanh toán',
      ])
    );
  },

  async customersCsv() {
    const users = await prisma.user.findMany({
      where: { role: { name: 'CUSTOMER' }, deletedAt: null },
      include: { _count: { select: { orders: { where: { status: 'COMPLETED' } } } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    const spentMap = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: 'COMPLETED', deletedAt: null },
      _sum: { total: true },
    });
    const spent = new Map(spentMap.map((s) => [s.userId, s._sum.total || 0]));
    return toCsv(
      ['STT', 'Tên', 'Email', 'SĐT', 'Số đơn hoàn thành', 'Tổng chi (VND)', 'Ngày đăng ký'],
      users.map((u, i) => [
        i + 1,
        u.fullName,
        u.email,
        u.phone || '',
        u._count.orders,
        formatVND(spent.get(u.id) || 0).replace(' ₫', ''),
        u.createdAt.toISOString().slice(0, 10),
      ])
    );
  },
};
