import { orderRepository as repo } from '../repositories/order.repository.js';
import { cartRepository } from '../repositories/cart.repository.js';
import { couponRepository } from '../repositories/coupon.repository.js';
import { contentRepository } from '../repositories/content.repository.js';
import { prisma } from '../config/prisma.js';
import { evalCoupon, computeTotals, shippingFeeFor } from '../utils/totals.js';
import {
  canTransition,
  DELIVERY_TIME_SLOTS,
  slotUnavailableReason,
  vnTodayISO,
  vnTodayStart,
} from '@ninicakes/shared';
import { fail } from '../utils/http.js';
import { buildMeta } from '../utils/pagination.js';
import { orderToDTO } from '../utils/dto.js';
import type { OrderStatus } from '@prisma/client';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';

interface CheckoutInput {
  couponCode?: string;
  /** Bỏ trống = mua cả giỏ; có giá trị = chỉ đặt các dòng giỏ hàng được chọn */
  itemIds?: number[];
  deliveryType: 'DELIVERY' | 'PICKUP';
  deliveryDate: string;
  timeSlot: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER';
  addressId?: number;
  address?: {
    fullName: string;
    phone: string;
    addressLine: string;
    ward?: string;
    district?: string;
    city: string;
    lat?: number | null;
    lng?: number | null;
    mapsUrl?: string | null;
  };
  note?: string;
}

function computeOrderCode(now: Date, seq: number): string {
  return `NC${vnTodayISO(now).replace(/-/g, '')}${String(seq).padStart(3, '0')}`;
}

export const orderService = {
  /* ============ Đặt hàng (transaction, server tính lại toàn bộ) ============ */
  async checkout(req: Request, input: CheckoutInput) {
    const userId = req.auth ? req.auth.id : null;
    if (!userId) throw fail('Vui lòng đăng nhập để hoàn tất đặt bánh.', 401);

    const cart = await cartRepository.findByUser(userId);
    const allItems = (cart?.items || []).filter((i) => i.variantId && i.quantity > 0);
    if (!allItems.length) throw fail('Giỏ của quý khách đang trống.', 409);

    /* Khách có thể chọn đặt lẻ vài món thay vì cả giỏ. Mã nào không khớp dòng
       đang có thật trong giỏ là lỗi, không được âm thầm bỏ qua — nếu không thì
       đơn tạo ra sẽ thiếu món mà khách tưởng đã đặt. */
    const wanted = input.itemIds?.length ? [...new Set(input.itemIds)] : null;
    const cartItems = wanted ? allItems.filter((i) => wanted.includes(i.id)) : allItems;
    if (wanted && cartItems.length !== wanted.length) {
      throw fail('Một vài món không còn trong giỏ. Quý khách vui lòng thử lại.', 409);
    }
    if (!cartItems.length) throw fail('Giỏ của quý khách đang trống.', 409);

    // Tồn kho + giá server-side
    const variantIds = cartItems.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true, name: true, isActive: true, deletedAt: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
      },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const lines: {
      variantId: number;
      productId: number;
      name: string;
      variantName: string;
      imageUrl: string | null;
      price: number;
      quantity: number;
      options: unknown;
    }[] = [];
    for (const item of cartItems) {
      const variant = variantMap.get(item.variantId);
      if (!variant || !variant.isActive || !variant.product.isActive || variant.product.deletedAt) {
        throw fail(`“Bánh” trong giỏ của quý khách hiện không còn bán. Vui lòng xem lại giỏ hàng.`, 409);
      }
      lines.push({
        variantId: variant.id,
        productId: variant.productId,
        name: variant.product.name,
        variantName: variant.name,
        imageUrl: variant.product.images[0]?.url ?? null,
        price: variant.price, // server-giá
        quantity: item.quantity,
        options: (item.options as Record<string, unknown>) || null,
      });
    }

    // Địa chỉ giao
    type Geo = { lat: number | null; lng: number | null; mapsUrl: string | null };
    let addressData: { fullName: string; phone: string; addressLine: string; ward?: string; district?: string; city: string } & Geo | null = null;
    if (input.deliveryType === 'DELIVERY') {
      if (input.addressId) {
        const addr = await prisma.address.findFirst({ where: { id: input.addressId, userId, deletedAt: null } });
        if (!addr) throw fail('Địa chỉ giao hàng không tìm thấy trong sổ địa chỉ.', 404);
        addressData = {
          fullName: addr.fullName, phone: addr.phone, addressLine: addr.addressLine,
          ward: addr.ward ?? '', district: addr.district ?? '', city: addr.city,
          lat: addr.lat, lng: addr.lng, mapsUrl: addr.mapsUrl,
        };
      } else if (input.address) {
        addressData = {
          fullName: input.address.fullName,
          phone: input.address.phone,
          addressLine: input.address.addressLine,
          ward: input.address.ward ?? '',
          district: input.address.district ?? '',
          city: input.address.city,
          lat: input.address.lat ?? null,
          lng: input.address.lng ?? null,
          mapsUrl: input.address.mapsUrl ?? null,
        };
      } else {
        throw fail('Vui lòng chọn hoặc nhập địa chỉ giao hàng.', 400);
      }
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    // Coupon
    let couponId: number | null = null;
    let couponCode: string | null = null;
    let discount = 0;
    if (input.couponCode) {
      const coupon = await couponRepository.findByCode(input.couponCode);
      if (!coupon) throw fail('Mã giảm giá không tồn tại.', 404);
      const now = new Date();
      const activeOk =
        coupon.isActive &&
        (!coupon.startsAt || coupon.startsAt <= now) &&
        (!coupon.endsAt || coupon.endsAt >= now) &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses);
      const calc = evalCoupon(coupon, subtotal, now);
      if (!activeOk) throw fail('Mã giảm giá không còn hiệu lực.', 409);
      if (!calc.valid) throw fail(calc.reason || 'Mã giảm giá không áp dụng cho đơn này.', 409);
      couponId = coupon.id;
      couponCode = coupon.code;
      discount = calc.discount;
    }

    // Phí giao hàng từ cài đặt cửa hàng
    const settings = await contentRepository.ensureSettings();
    const shippingFee = shippingFeeFor(subtotal, settings.shippingFeeVnd, settings.freeShippingMinVnd, input.deliveryType);
    const totals = computeTotals(lines.map((l) => ({ price: l.price, quantity: l.quantity })), { discount, shippingFee });

    // Thời gian giao — server chạy UTC nên phải so theo giờ Việt Nam
    if (!(DELIVERY_TIME_SLOTS as readonly string[]).includes(input.timeSlot)) {
      throw fail('Khung giờ nhận hàng chưa hợp lệ.', 400);
    }
    const slotErr = slotUnavailableReason(input.deliveryDate, input.timeSlot);
    if (slotErr) throw fail(slotErr, 400);
    const when = new Date(`${input.deliveryDate}T00:00:00+07:00`);
    const todayStart = new Date(vnTodayStart());

    const now = new Date();
    const results = await prisma.$transaction(async (tx) => {
      let seq = await prisma.order.count({ where: { createdAt: { gte: todayStart } } });
      const code = computeOrderCode(now, seq + 1);
      const payload: Prisma.OrderUncheckedCreateInput = {
        code,
        userId: userId!,
        status: 'PENDING',
        deliveryType: input.deliveryType,
        deliveryDate: when,
        timeSlot: input.timeSlot,
        recipientName: addressData ? addressData.fullName : req.auth!.fullName,
        recipientPhone: addressData ? addressData.phone : '',
        addressLine: addressData ? addressData.addressLine : null,
        ward: addressData ? addressData.ward : null,
        district: addressData ? addressData.district : null,
        city: addressData ? addressData.city : null,
        lat: addressData?.lat ?? null,
        lng: addressData?.lng ?? null,
        mapsUrl: addressData?.mapsUrl ?? null,
        note: input.note || null,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        couponId,
        couponCode,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'UNPAID',
      };
      let order;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
           
          order = await repo.createOrder(tx, payload);
          break;
        } catch (e) {
          const erro = e as { code?: string };
          if (erro?.code === 'P2002') {
            seq += 1;
            payload.code = computeOrderCode(now, seq + 1);
          } else {
            throw e;
          }
        }
      }
      if (!order) throw fail('Không tạo được đơn hàng, vui lòng thử lại.', 500);

      for (const l of lines) {
        await repo.createOrderItem(tx, {
          orderId: order.id,
          productId: l.productId,
          variantId: l.variantId,
          name: l.name,
          variantName: l.variantName,
          imageUrl: l.imageUrl,
          unitPrice: l.price,
          quantity: l.quantity,
          lineTotal: l.price * l.quantity,
          options: (l.options ?? undefined) as Prisma.InputJsonValue | undefined,
        });
      }
      await repo.createHistoryTx(tx, {
        orderId: order.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedById: userId,
      });
      if (couponId) {
        await couponRepository.incrementUsedTx(tx, couponId);
      }
      /* Đơn chuyển khoản: GIỮ LẠI giỏ — khách còn quay lui kiểm tra hoặc trả sau.
         Giỏ chỉ dọn khi tiền thực sự về (markPaid / admin xác nhận). */
      /* Chỉ dọn đúng những món vừa đặt — khách chọn đặt lẻ thì phần còn lại
         vẫn phải nằm nguyên trong giỏ. */
      if (cart && input.paymentMethod === 'COD')
        await tx.cartItem.deleteMany({ where: { id: { in: cartItems.map((i) => i.id) } } });
      return order;
    });

    const created = await repo.getById(results.id);
    return orderToDTO(created!);
  },

  /* ============ Khách hàng ============ */
  async listMine(userId: number, page: number, perPage: number, status?: string) {
    const { items, total } = await repo.listMine(userId, { page, perPage, status });
    return { items: items.map(orderToDTO), meta: buildMeta(total, page, perPage) };
  },
  async getMine(userId: number, id: number) {
    const o = await repo.getMine(userId, id);
    if (!o) throw fail('Không tìm thấy đơn hàng của quý khách.', 404);
    return orderToDTO(o);
  },
  async cancelMine(userId: number, id: number, reason?: string) {
    const o = await repo.getMine(userId, id);
    if (!o) throw fail('Không tìm thấy đơn hàng của quý khách.', 404);
    if (!['PENDING', 'CONFIRMED'].includes(o.status)) {
      throw fail('Đơn đã vào giai đoạn làm bánh nên không thể tự hủy. Vui lòng gọi tiệm để được hỗ trợ.', 409);
    }
    return this.cancelOrder(o.id, 'Đã hủy bởi khách hàng: ' + (reason || 'Quý khách thay đổi kế hoạch.'));
  },

  /* ============ Quản trị ============ */
  async listAdmin(params: Record<string, string | number | undefined>) {
    const { items, total } = await repo.listAdmin({
      page: Number(params.page) || 1,
      perPage: Number(params.perPage) || 12,
      status: params.status as string | undefined,
      search: params.search as string | undefined,
      deliveryType: params.deliveryType as string | undefined,
      deliveryDate: params.deliveryDate as string | undefined,
      from: params.from as string | undefined,
      to: params.to as string | undefined,
      paymentStatus: params.paymentStatus as string | undefined,
    });
    return { items: items.map(orderToDTO), meta: buildMeta(total, Number(params.page) || 1, Number(params.perPage) || 12) };
  },
  async adminGet(id: number) {
    const o = await repo.getById(id);
    if (!o) throw fail('Không tìm thấy đơn hàng.', 404);
    return orderToDTO(o);
  },

  async updateStatus(adminId: number, orderId: number, toStatus: OrderStatus, note?: string) {
    const o = await repo.getById(orderId);
    if (!o) throw fail('Không tìm thấy đơn hàng.', 404);
    if (o.status === toStatus) return orderToDTO(o);
    const allowed = canTransition(o.status as never, toStatus as never);
    if (!allowed) throw fail(`Không thể chuyển đơn từ trạng thái này sang trạng thái đó.`, 409);
    if (toStatus === 'SHIPPED' && o.deliveryType === 'PICKUP') {
      throw fail('Đơn nhận tại tiệm không cần bước giao hàng.', 409);
    }
    if (toStatus === 'CANCELLED') {
      await this.cancelOrder(orderId, note || 'Đã hủy bởi cửa hàng và thông báo cho khách.', true);
      return this.adminGet(orderId);
    }
    const data: Prisma.OrderUpdateInput = { status: toStatus };
    if (toStatus === 'COMPLETED' && o.paymentStatus === 'UNPAID' && o.paymentMethod === 'COD') {
      data.paymentStatus = 'PAID';
    }
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data });
      await repo.createHistoryTx(tx, {
        orderId,
        fromStatus: o.status,
        toStatus,
        note: note || null,
        changedById: adminId,
      });
      if (toStatus === 'COMPLETED') {
        await repo.createPaymentTx(tx, {
          orderId,
          amount: o.total,
          method: o.paymentMethod,
          status: o.paymentMethod === 'COD' ? 'PAID' : o.paymentStatus,
          paidAt: new Date(),
        });
      }
    });
    return this.adminGet(orderId);
  },

  async cancelOrder(orderId: number, reason: string, byAdmin = false) {
    const o = await repo.getById(orderId);
    if (!o) throw fail('Không tìm thấy đơn hàng.', 404);
    if (['COMPLETED', 'CANCELLED'].includes(o.status as string)) {
      throw fail('Đơn hiện ở trạng thái không thể hủy.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          ...(byAdmin ? {} : {}),
        },
      });
      await repo.createHistoryTx(tx, {
        orderId,
        fromStatus: o.status,
        toStatus: 'CANCELLED',
        note: reason,
        changedById: null,
      });
      if (o.couponId) await couponRepository.decrementUsedTx(tx, o.couponId);
    });
    return this.adminGet(orderId);
  },

  /** Tiền về thật rồi mới dọn giỏ của khách. */
  async clearCartForOrder(orderId: number) {
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!o?.userId) return;
    const cart = await cartRepository.findByUser(o.userId);
    if (cart?.items.length) await cartRepository.clear(cart.id);
  },

  async setPayment(adminId: number, orderId: number, status: 'UNPAID' | 'PAID' | 'REFUNDED', reference?: string) {
    const o = await repo.getById(orderId);
    if (!o) throw fail('Không tìm thấy đơn hàng.', 404);
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
      await repo.createPaymentTx(tx, {
        orderId,
        amount: o.total,
        method: o.paymentMethod,
        status,
        reference: reference || null,
        paidAt: status === 'PAID' ? new Date() : null,
      });
      await repo.createHistoryTx(tx, {
        orderId,
        fromStatus: o.status,
        toStatus: o.status,
        note: `Cập nhật thanh toán: ${status}`,
        changedById: adminId,
      });
    });
    if (status === 'PAID') await this.clearCartForOrder(orderId);
    return this.adminGet(orderId);
  },
};
