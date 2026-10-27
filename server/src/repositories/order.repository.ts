import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import type { OrderStatus } from '@prisma/client';

const orderInclude = {
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      product: { select: { images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
    },
  },
  history: { orderBy: { createdAt: 'asc' as const }, include: { changedBy: { select: { id: true, fullName: true } } } },
  user: { select: { id: true, email: true, fullName: true, phone: true } },
  payments: true,
} as const;

export const orderRepository = {
  /* ============ Khách hàng ============ */
  async listMine(userId: number, params: { page: number; perPage: number; status?: string }) {
    const where: Prisma.OrderWhereInput = {
      userId,
      deletedAt: null,
      ...(params.status
        ? { status: params.status.toUpperCase() as OrderStatus }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },
  getMine: (userId: number, id: number) =>
    prisma.order.findFirst({ where: { id, userId, deletedAt: null }, include: orderInclude }),

  /* ============ Quản trị ============ */
  async listAdmin(params: {
    page: number; perPage: number; status?: string; search?: string; deliveryType?: string;
    deliveryDate?: string; from?: string; to?: string;
  }) {
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status.toUpperCase() as OrderStatus } : {}),
      ...(params.deliveryType ? { deliveryType: params.deliveryType.toUpperCase() as 'DELIVERY' | 'PICKUP' } : {}),
      ...(params.deliveryDate ? { deliveryDate: new Date(params.deliveryDate) } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: new Date(`${params.from}T00:00:00+07:00`) } : {}),
              ...(params.to ? { lte: new Date(`${params.to}T23:59:59+07:00`) } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { code: { contains: params.search } },
              { recipientName: { contains: params.search } },
              { recipientPhone: { contains: params.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },
  getById: (id: number) =>
    prisma.order.findFirst({ where: { id, deletedAt: null }, include: orderInclude }),
  update: (id: number, data: Prisma.OrderUpdateInput) => prisma.order.update({ where: { id }, data }),
  addHistory: (data: { orderId: number; fromStatus: OrderStatus | null; toStatus: OrderStatus; note?: string | null; changedById?: number | null }) =>
    prisma.orderStatusHistory.create({ data }),

  /* ============ Transaction cho đặt hàng ============ */
  async findByIdForUpdate(tx: Prisma.TransactionClient, ids: number[]) {
    return tx.$queryRaw<{ id: number; stock: number; price: number; isActive: number }[]>(
      Prisma.sql`SELECT id, stock, price, isActive FROM product_variants WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`
    );
  },
  createOrder: (tx: Prisma.TransactionClient, data: Prisma.OrderUncheckedCreateInput) =>
    tx.order.create({ data, include: { items: true } }),
  createOrderItem: (tx: Prisma.TransactionClient, data: Prisma.OrderItemUncheckedCreateInput) =>
    tx.orderItem.create({ data }),
  createHistoryTx: (tx: Prisma.TransactionClient, data: Prisma.OrderStatusHistoryUncheckedCreateInput) =>
    tx.orderStatusHistory.create({ data }),
  createPaymentTx: (tx: Prisma.TransactionClient, data: Prisma.PaymentUncheckedCreateInput) =>
    tx.payment.create({ data }),
  decrementStockTx: (tx: Prisma.TransactionClient, variantId: number, quantity: number) =>
    tx.productVariant.updateMany({
      where: { id: variantId, stock: { gte: quantity }, isActive: true },
      data: { stock: { decrement: quantity } },
    }),
  incrementStockTx: (tx: Prisma.TransactionClient, map: { variantId: number; quantity: number }[]) =>
    Promise.all(
      map.map((m) =>
        tx.productVariant.update({ where: { id: m.variantId }, data: { stock: { increment: m.quantity } } })
      )
    ),
  soldCountIncrementTx: (tx: Prisma.TransactionClient, rows: { variantId: number; productId: number; qty: number }[]) =>
    Promise.all(
      rows.flatMap((r) => [
        tx.productVariant.update({ where: { id: r.variantId }, data: { soldCount: { increment: r.qty } } }),
        tx.product.update({ where: { id: r.productId }, data: { soldCount: { increment: r.qty } } }),
      ])
    ),

  /* Khác */
  countToday: (startOfDay: Date) => prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
  setPaymentStatus: (id: number, status: 'UNPAID' | 'PAID' | 'REFUNDED') =>
    prisma.order.update({ where: { id }, data: { paymentStatus: status } }),
  softDelete: (id: number) => prisma.order.update({ where: { id }, data: { deletedAt: new Date() } }),
};
