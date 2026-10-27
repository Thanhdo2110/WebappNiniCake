import { prisma } from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const reviewRepository = {
  async listByProduct(productId: number, page: number, perPage: number) {
    const where = { productId, isApproved: true, isHidden: false, deletedAt: null };
    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { user: { select: { id: true, fullName: true } } },
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },
  listMine: (userId: number) =>
    prisma.review.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, slug: true } } },
    }),
  async listAdmin(params: { page: number; perPage: number; approved?: 'true' | 'false'; userId?: number }) {
    const where: Prisma.ReviewWhereInput = { deletedAt: null };
    if (params.approved === 'true') Object.assign(where, { isApproved: true, isHidden: false });
    else if (params.approved === 'false') Object.assign(where, { OR: [{ isApproved: false }, { isHidden: true }] });
    if (params.userId) Object.assign(where, { userId: params.userId });
    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },
  getMineById: (userId: number, id: number) =>
    prisma.review.findFirst({ where: { id, userId, deletedAt: null } }),
  getById: (id: number) => prisma.review.findFirst({ where: { id, deletedAt: null }, include: { product: true } }),
  findByProductAndUser: (productId: number, userId: number) =>
    prisma.review.findUnique({ where: { productId_userId: { productId, userId } } }),
  revive: (
    id: number,
    data: { rating: number; comment?: string | null; imageUrl?: string | null }
  ) =>
    prisma.review.update({
      where: { id },
      data: { ...data, deletedAt: null, isApproved: false, isHidden: false, reply: null, repliedAt: null },
    }),
  create: (data: { productId: number; userId: number; orderId?: number | null; rating: number; comment?: string | null; imageUrl?: string | null }) =>
    prisma.review.create({ data }),
  approve: (id: number, isApproved: boolean) => prisma.review.update({ where: { id }, data: { isApproved } }),
  setHidden: (id: number, isHidden: boolean) => prisma.review.update({ where: { id }, data: { isHidden } }),
  reply: (id: number, reply: string) =>
    prisma.review.update({ where: { id }, data: { reply, repliedAt: new Date() } }),
  softDelete: (id: number) => prisma.review.update({ where: { id }, data: { deletedAt: new Date() } }),
  topApproved: (take: number) =>
    prisma.review.findMany({
      where: { isApproved: true, isHidden: false, deletedAt: null, rating: { gte: 4 } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        user: { select: { id: true, fullName: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    }),

  /** Tính lại trung bình & số lượng review công khai */
  async refreshProductRating(productId: number, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const agg = await client.review.aggregate({
      where: { productId, isApproved: true, isHidden: false, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await client.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10,
        ratingCount: agg._count._all,
      },
    });
  },
};
