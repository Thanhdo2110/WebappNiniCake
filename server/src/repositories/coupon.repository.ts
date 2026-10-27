import { prisma } from '../config/prisma.js';
import type { CouponType } from '@prisma/client';

export const couponRepository = {
  findByCode: (code: string) =>
    prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), deletedAt: null },
    }),
  list: (page: number, perPage: number) =>
    prisma.$transaction([
      prisma.coupon.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.coupon.count({ where: { deletedAt: null } }),
    ]),
  create: (
    data: {
      code: string;
      description?: string | null;
      type: string;
      value: number;
      minSubtotal: number;
      maxDiscount?: number | null;
      maxUses?: number | null;
      startsAt?: Date | null;
      endsAt?: Date | null;
      isActive: boolean;
    },
  ) =>
    prisma.coupon.create({
      data: { ...data, type: data.type as CouponType },
    }),
  getById: (id: number) => prisma.coupon.findFirst({ where: { id, deletedAt: null } }),
  update: (id: number, data: Record<string, unknown>) => prisma.coupon.update({ where: { id }, data }),
  softDelete: (id: number) => prisma.coupon.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }),
  incrementUsedTx: (tx: import('@prisma/client').Prisma.TransactionClient, id: number) =>
    tx.coupon.update({ where: { id }, data: { usedCount: { increment: 1 } } }),
  decrementUsedTx: (tx: import('@prisma/client').Prisma.TransactionClient, id: number) =>
    tx.coupon.update({ where: { id }, data: { usedCount: { decrement: 1 } } }),
};
