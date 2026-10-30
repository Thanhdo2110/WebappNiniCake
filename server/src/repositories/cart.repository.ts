import { prisma } from '../config/prisma.js';
import crypto from 'node:crypto';

/** Giỏ hàng theo user hoặc token (cookie NC_VID) */
export const cartRepository = {
  async findByToken(token: string) {
    return prisma.cart.findUnique({
      where: { token },
      include: { items: true },
    });
  },
  async findByUser(userId: number) {
    return prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
  },
  async ensureFor(userId: number | null, token: string) {
    if (userId) {
      const byUser = await this.findByUser(userId);
      if (byUser) return byUser;
      /* Chỉ nhận giỏ chưa có chủ, và hủy token khi nhận — xem cart.middleware.ts.
         Nếu bỏ qua điều kiện userId: null thì cookie sót lại sau đăng xuất sẽ
         chuyển chủ giỏ hàng của người khác. */
      const byToken = await this.findByToken(token);
      if (byToken && byToken.userId === null) {
        return prisma.cart.update({ where: { id: byToken.id }, data: { userId, token: null }, include: { items: true } });
      }
      return prisma.cart.create({ data: { userId }, include: { items: true } });
    }
    return this.ensureGuest(token);
  },
  async ensureGuest(token: string) {
    const existed = await this.findByToken(token);
    if (existed && existed.userId === null) return existed;
    /* Token trỏ tới giỏ của user (dữ liệu cũ còn giữ token sau khi gán chủ) —
       tuyệt đối không giao giỏ đó cho khách vãng lai. Lập một giỏ khách mới. */
    return prisma.cart.create({ data: { token: crypto.randomUUID() }, include: { items: true } });
  },

  createItem: (cartId: number, variantId: number, quantity: number, unitPrice: number, options: unknown) =>
    prisma.cartItem.create({ data: { cartId, variantId, quantity, unitPrice, options: options ?? undefined } }),
  getItem: (cartId: number, itemId: number) =>
    prisma.cartItem.findFirst({ where: { id: itemId, cartId }, include: { variant: true } }),
  updateItem: (itemId: number, data: { quantity?: number; unitPrice?: number }) =>
    prisma.cartItem.update({ where: { id: itemId }, data }),
  deleteItem: (itemId: number) => prisma.cartItem.delete({ where: { id: itemId } }),
  clear: (cartId: number) => prisma.cartItem.deleteMany({ where: { cartId } }),

  async withVariants(cartId: number) {
    return prisma.cartItem.findMany({
      where: { cartId },
      orderBy: { id: 'asc' },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, isActive: true, deletedAt: true },
            },
          },
        },
      },
    });
  },
  itemCount: (cartId: number) => prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } }),
};
