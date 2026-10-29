/** PayOS: tạo link chuyển khoản kèm tài khoản ảo + QR, và đối soát trạng thái từ phía server.
    Nguyên tắc: client không bao giờ tự đánh dấu đã thanh toán — chỉ số tiền PayOS báo về mới quyết định. */
import { PayOS } from '@payos/node';
import QRCode from 'qrcode';
import { envs, payosEnabled } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { orderRepository as repo } from '../repositories/order.repository.js';
import { cartRepository } from '../repositories/cart.repository.js';
import { fail } from '../utils/http.js';
import type { Prisma } from '@prisma/client';

const MIN_AMOUNT = 1000;

export interface PayosMeta {
  provider: 'payos';
  paymentLinkId: string;
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
  qrCode: string;
  checkoutUrl: string;
}

let cached: PayOS | null = null;
function sdk() {
  if (!payosEnabled) throw fail('Tiệm chưa bật thanh toán chuyển khoản online.', 503);
  cached ??= new PayOS({
    clientId: envs.payos.clientId,
    apiKey: envs.payos.apiKey,
    checksumKey: envs.payos.checksumKey,
    ...(envs.payos.baseUrl ? { baseURL: envs.payos.baseUrl } : {}),
  });
  return cached;
}

const url = (path: string) => `${envs.payos.publicUrl}${path}`;
/** PayOS chỉ nhận mô tả chữ thường/chữ hoa/số, tối đa 25 ký tự */
const contentOf = (code: string) => code.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || 'NC';

type OrderWithPayments = Awaited<ReturnType<typeof repo.getById>>;
type Link = Awaited<ReturnType<PayOS['paymentRequests']['get']>>;

function metaOf(order: NonNullable<OrderWithPayments>): PayosMeta | null {
  const rows = (order.payments || []).filter((p) => p.providerMeta && typeof p.providerMeta === 'object');
  const last = rows.sort((a, b) => b.id - a.id)[0];
  const meta = last?.providerMeta as unknown as PayosMeta | undefined;
  return meta && meta.provider === 'payos' && meta.paymentLinkId ? meta : null;
}

export const payosService = {
  isEnabled: () => payosEnabled,

  /** Link còn hiệu lực của đơn, hoặc tạo mới. Gọi lặp lại nhiều lần không sinh trùng. */
  async ensureLink(userId: number, orderId: number) {
    const order = await repo.getMine(userId, orderId);
    if (!order) throw fail('Không tìm thấy đơn hàng.', 404);
    if (order.paymentMethod !== 'BANK_TRANSFER') throw fail('Đơn này không dùng chuyển khoản.', 400);
    if (order.status === 'CANCELLED') throw fail('Đơn đã hủy nên không tạo được mã thanh toán.', 400);
    if (order.paymentStatus === 'PAID') return view('PAID', null, order.total);
    if (order.total < MIN_AMOUNT) throw fail('Đơn nhỏ hơn 1.000 ₫ nên không thanh toán online được.', 400);

    const existing = metaOf(order);
    if (existing) {
      const live = await this.fetchLink(existing.paymentLinkId);
      if (live.status === 'PAID') {
        await this.markPaid(order.id, existing, live);
        return view('PAID', null, order.total);
      }
      if (live.status === 'PENDING' || live.status === 'PROCESSING') return view(live.status, existing, order.total);
      /* EXPIRED / CANCELLED / FAILED / UNDERPAID → mở link mới, link cũ giữ nguyên để truy vết */
    }

    const res = await guard(() =>
      sdk().paymentRequests.create({
        orderCode: order.id,
        amount: order.total,
        description: contentOf(order.code),
        returnUrl: url(`/tai-khoan/don-hang/${order.id}?pay=return`),
        cancelUrl: url(`/tai-khoan/don-hang/${order.id}?pay=cancel`),
        buyerName: order.recipientName.slice(0, 80),
        ...(order.recipientPhone ? { buyerPhone: order.recipientPhone.slice(0, 20) } : {}),
        ...(order.user?.email ? { buyerEmail: order.user.email.slice(0, 120) } : {}),
      })
    );

    const meta: PayosMeta = {
      provider: 'payos',
      paymentLinkId: res.paymentLinkId,
      bin: res.bin,
      accountNumber: res.accountNumber,
      accountName: res.accountName,
      amount: res.amount,
      content: res.description,
      qrCode: res.qrCode,
      checkoutUrl: res.checkoutUrl,
    };
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'BANK_TRANSFER',
        status: 'UNPAID',
        amount: order.total,
        reference: res.paymentLinkId,
        providerMeta: meta as unknown as Prisma.InputJsonValue,
      },
    });
    return view('PENDING', meta, order.total);
  },

  /** Khách bấm "Kiểm tra thanh toán", hoặc trang đơn tải lại */
  async syncMine(userId: number, orderId: number) {
    const order = await repo.getMine(userId, orderId);
    if (!order) throw fail('Không tìm thấy đơn hàng.', 404);
    const meta = metaOf(order);
    if (!meta) return view(order.paymentStatus, null, order.total);
    if (order.paymentStatus === 'PAID') return view('PAID', null, order.total);
    const live = await this.fetchLink(meta.paymentLinkId);
    if (live.status === 'PAID') {
      await this.markPaid(order.id, meta, live);
      return view('PAID', null, order.total);
    }
    return view(live.status, meta, order.total);
  },

  /** IPN từ PayOS: verify chữ ký bằng SDK, rồi gọi lại API để lấy số tiền thật */
  async handleWebhook(payload: unknown) {
    let orderCode: number;
    try {
      const data = await sdk().webhooks.verify(payload as Parameters<PayOS['webhooks']['verify']>[0]);
      orderCode = Number(data.orderCode);
    } catch {
      throw fail('Chữ ký không hợp lệ.', 400);
    }
    if (!Number.isInteger(orderCode)) return { received: true };
    const order = await repo.getById(orderCode);
    const meta = order ? metaOf(order) : null;
    if (order && meta && order.paymentStatus !== 'PAID') {
      const live = await this.fetchLink(meta.paymentLinkId);
      if (live.status === 'PAID') await this.markPaid(order.id, meta, live);
    }
    return { received: true };
  },

  async registerWebhook(webhookUrl: string) {
    return guard(() => sdk().webhooks.confirm(webhookUrl));
  },

  async fetchLink(paymentLinkId: string): Promise<Link> {
    return guard(() => sdk().paymentRequests.get(paymentLinkId));
  },

  /** Chỉ đi lên: UNPAID → PAID khi PayOS xác nhận đã nhận đủ tiền */
  async markPaid(orderId: number, meta: PayosMeta, link: Link) {
    if (link.amountPaid < meta.amount) return false;
    const txn = link.transactions?.[link.transactions.length - 1];
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID' } }),
      prisma.payment.updateMany({
        where: { orderId, reference: meta.paymentLinkId },
        data: { status: 'PAID', paidAt: new Date(), reference: txn?.reference || meta.paymentLinkId },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: 'PENDING',
          toStatus: 'PENDING',
          note: `PayOS xác nhận đã nhận ${link.amountPaid} ₫${txn?.reference ? ` (giao dịch ${txn.reference})` : ''}.`,
        },
      }),
    ]);
    /* Tiền về rồi mới dọn giỏ của khách — trước đó khách còn quay lại giỏ hàng được */
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (order?.userId) {
      const cart = await cartRepository.findByUser(order.userId);
      if (cart?.items.length) await cartRepository.clear(cart.id);
    }
    return true;
  },
};

async function view(status: string, meta: PayosMeta | null, amount: number) {
  return {
    enabled: payosEnabled,
    status,
    paid: status === 'PAID',
    amount: meta?.amount ?? amount,
    accountName: meta?.accountName ?? '',
    accountNumber: meta?.accountNumber ?? '',
    bin: meta?.bin ?? '',
    content: meta?.content ?? '',
    qrContent: meta?.qrCode ?? '',
    qrDataUrl: meta?.qrCode ? await qrSvg(meta.qrCode) : '',
    checkoutUrl: meta?.checkoutUrl ?? '',
  };
}

/** PayOS trả về chuỗi nội dung EMVCo chứ không phải ảnh — tự dựng SVG để không phụ thuộc bên thứ 3. */
async function qrSvg(payload: string) {
  const svg = await QRCode.toString(payload, { type: 'svg', margin: 1, width: 320, errorCorrectionLevel: 'M' });
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Lỗi từ PayOS trả về client bằng tiếng Việt, không lộ mã nội bộ */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    console.error('[payos]', msg);
    throw fail('Không kết nối được với cổng thanh toán, bạn thử lại sau nhé.', 502);
  }
}
