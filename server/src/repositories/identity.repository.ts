import { prisma } from '../config/prisma.js';
import type { Prisma, RoleName } from '@prisma/client';

const publicSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  role: { select: { name: true } },
} as const;

export const identityRepository = {
  async findRole(name: string) {
    return prisma.role.findUnique({ where: { name: name as RoleName } });
  },
  async createUser(data: {
    roleId: number;
    email?: string | null;
    passwordHash: string;
    fullName: string;
    phone?: string | null;
  }) {
    return prisma.user.create({
      data: {
        roleId: data.roleId,
        email: data.email ?? null,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone ?? null,
      },
      include: { role: true },
    });
  },
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { role: true },
    });
  },
  async findByPhone(phone: string) {
    return prisma.user.findFirst({
      where: { phone, deletedAt: null },
      include: { role: true },
    });
  },
  async findById(id: number) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
  },
  async updateProfile(id: number, data: { fullName?: string; phone?: string | null; avatarUrl?: string | null }) {
    return prisma.user.update({ where: { id }, data });
  },
  async updatePassword(id: number, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  /* ---- Admin users list ---- */
  async listUsers(params: { roleNames: string[]; q?: string; page: number; perPage: number }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: { name: { in: params.roleNames as RoleName[] } },
      ...(params.q
        ? {
            OR: [
              { fullName: { contains: params.q } },
              { email: { contains: params.q } },
              { phone: { contains: params.q } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          ...publicSelect,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },
  async setUserStatus(id: number, status: 'ACTIVE' | 'BLOCKED') {
    return prisma.user.update({ where: { id }, data: { status } });
  },
  async userStats(userId: number) {
    const [orderCount, spent] = await Promise.all([
      prisma.order.count({ where: { userId, deletedAt: null } }),
      prisma.order.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { total: true } }),
    ]);
    return { orderCount, totalSpent: spent._sum.total || 0 };
  },

  /* ---- Addresses ---- */
  async listAddresses(userId: number) {
    return prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });
  },
  async getAddress(userId: number, id: number) {
    return prisma.address.findFirst({ where: { id, userId, deletedAt: null } });
  },
  async createAddress(userId: number, data: {
    fullName: string; phone: string; addressLine: string;
    ward?: string | null; district?: string | null; city: string;
    lat?: number | null; lng?: number | null; mapsUrl?: string | null;
    isDefault: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({ data: { ...data, userId } });
    });
  },
  async updateAddress(userId: number, id: number, data: AddressBody) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id }, data });
    });
  },
  async softDeleteAddress(userId: number, id: number) {
    return prisma.address.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  /* ---- Refresh tokens ---- */
  async saveRefreshToken(userId: number, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },
  async findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: { include: { role: true } } } });
  },
  async revokeRefreshToken(tokenHash: string) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
  async revokeAllUserTokens(userId: number) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /* ---- Wishlist ---- */
  async listWishlist(userId: number) {
    return prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, price: true, compareAtPrice: true,
            shortDescription: true, isActive: true, soldCount: true, ratingAvg: true, ratingCount: true,
            images: { select: { url: true, isPrimary: true, sortOrder: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          },
        },
      },
    });
  },
  async addToWishlist(userId: number, productId: number) {
    return prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  },
  async removeFromWishlist(userId: number, productId: number) {
    await prisma.wishlist.deleteMany({ where: { userId, productId } });
  },
};

type AddressBody = {
  fullName?: string;
  phone?: string;
  addressLine?: string;
  ward?: string | null;
  district?: string | null;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  isDefault?: boolean;
};
