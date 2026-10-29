import type { Request } from 'express';
import { prisma } from '../config/prisma.js';
import { cartRepository as repo } from '../repositories/cart.repository.js';
import { authCookieToken } from './helpers.js';
import { fail } from '../utils/http.js';
import { DELIVERY_TIME_SLOTS, MAX_CART_QUANTITY } from '@ninicakes/shared';

function normalizeOptions(options?: {
  messageOnCake?: string;
  notes?: string;
  referenceImageUrl?: string | null;
}) {
  if (!options) return null;
  const clean = {
    ...(options.messageOnCake ? { messageOnCake: options.messageOnCake } : {}),
    ...(options.notes ? { notes: options.notes } : {}),
    ...(options.referenceImageUrl ? { referenceImageUrl: options.referenceImageUrl } : {}),
  };
  return Object.keys(clean).length ? clean : null;
}

export const cartService = {
  /** GET giỏ hàng hiện tại (theo user đăng nhập hoặc token cookie) */
  async getCart(req: Request) {
    const cart = await repo.ensureFor(req.auth?.id ?? null, req.cartToken || authCookieToken(req) || '');
    const summary = await this.summaryOf(cart.id, cart.token);
    return summary;
  },

  async summaryOf(cartId: number, _token?: string | null) {
    const rows = await repo.withVariants(cartId);
    // Luôn refresh unitPrice mới nhất của biến thể (admin có thể đổi giá bất kỳ lúc nào)
    const freshItems = await Promise.all(
      rows.map(async (item) => {
        const variant = item.variant;
        if (variant && variant.price !== item.unitPrice) {
          await prisma.cartItem.update({ where: { id: item.id }, data: { unitPrice: variant.price } });
          return { ...item, unitPrice: variant.price };
        }
        return item;
      })
    );
    // Ảnh đại diện theo productId
    const productIds = [...new Set(freshItems.map((i) => i.variant.product.id))];
    const imgs = productIds.length
      ? await prisma.productImage.findMany({
          where: { productId: { in: productIds } },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        })
      : [];
    const byProduct = new Map<number, string | null>();
    for (const pid of productIds) {
      const prod = imgs.filter((x) => x.productId === pid && x.url);
      byProduct.set(pid, prod.length ? (prod[0].url as string) : null);
    }
    return cartSummaryFromRows(freshItems, byProduct);
  },

  /** POST thêm một biến thể vào giỏ */
  async addItem(req: Request, input: { variantId: number; quantity: number; options?: Record<string, unknown> }) {
    const cart = await repo.ensureFor(req.auth?.id ?? null, req.cartToken || authCookieToken(req) || '');
    const variant = await prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: { select: { isActive: true, deletedAt: true, name: true } } },
    });
    if (!variant || !variant.isActive || !variant.product.isActive || variant.product.deletedAt) {
      throw fail('Bánh này hiện không còn được bán. Vui lòng chọn mẫu khác.', 404);
    }
    const options = normalizeOptions(input.options as never);
    const optKey = options ? JSON.stringify(options) : '';

    let item = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId: input.variantId },
    });
    if (item && (item.options ? JSON.stringify(item.options) : '') !== optKey) item = null;

    if (item) {
      const newQty = Math.min(item.quantity + input.quantity, MAX_CART_QUANTITY);
      await repo.updateItem(item.id, { quantity: newQty, unitPrice: variant.price });
    } else {
      await repo.createItem(cart.id, input.variantId, Math.min(input.quantity, MAX_CART_QUANTITY), variant.price, options);
    }
    return await this.getCartSafe(cart.id);
  },

  /** PATCH cập nhật số lượng */
  async updateItem(req: Request, itemId: number, quantity: number) {
    const cart = await repo.ensureFor(req.auth?.id ?? null, req.cartToken || authCookieToken(req) || '');
    const item = await repo.getItem(cart.id, itemId);
    if (!item) throw fail('Không tìm thấy bánh trong giỏ.', 404);
    await repo.updateItem(itemId, { quantity, unitPrice: item.variant.price });
    return await this.getCartSafe(cart.id);
  },

  async removeItem(req: Request, itemId: number) {
    const cart = await repo.ensureFor(req.auth?.id ?? null, req.cartToken || authCookieToken(req) || '');
    const item = await repo.getItem(cart.id, itemId);
    if (!item) throw fail('Không tìm thấy bánh trong giỏ.', 404);
    await repo.deleteItem(itemId);
    return await this.getCartSafe(cart.id);
  },

  async clear(req: Request) {
    const cart = await repo.ensureFor(req.auth?.id ?? null, req.cartToken || authCookieToken(req) || '');
    await repo.clear(cart.id);
    return { items: [], subtotal: 0 };
  },

  async getCartSafe(cartId: number) {
    return await this.summaryOf(cartId, '');
  },

  /** GET khung giờ có sẵn (dùng frontend hiển thị select) */
  timeSlots(): string[] {
    return [...DELIVERY_TIME_SLOTS];
  },
};

/** Hỗ trợ summary từ raw rows */
function cartSummaryFromRows(
  rows: { id: number; cartId: number; variantId: number; quantity: number; unitPrice: number; options: unknown; variant: { id: number; name: string; flavor: string | null; price: number; isActive: boolean; product: { id: number; name: string; slug: string; isActive: boolean; deletedAt: Date | null } } }[],
  imageMap: Map<number, string | null>
) {
  const usable = rows.filter((r) => r.variant && r.variant.product && r.variant.product.isActive && !r.variant.product.deletedAt && r.variant.isActive);
  const items = usable.map((r) => ({
    id: r.id,
    variantId: r.variantId,
    productId: r.variant.product.id,
    productName: r.variant.product.name,
    productSlug: r.variant.product.slug ?? null,
    variantName: r.variant.name,
    imageUrl: imageMap.get(r.variant.product.id) ?? null,
    unitPrice: r.unitPrice,
    quantity: r.quantity,
    lineTotal: r.unitPrice * r.quantity,
    options: (r.options as { messageOnCake?: string; notes?: string; referenceImageUrl?: string | null }) ?? null,
  }));
  return { items, subtotal: items.reduce((s, i) => s + i.lineTotal, 0) } as { items: unknown[]; subtotal: number };
}
