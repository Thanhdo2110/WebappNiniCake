import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';

const COOKIE = 'NC_VID';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax' as const, maxAge: 365 * 24 * 3600 * 1000 };

/**
 * Gán giỏ hàng theo cookie NC_VID:
 * - Đã đăng nhập → tra giỏ theo userId. Giỏ khách chỉ được nhận khi chưa có chủ,
 *   và ngay khi nhận thì token bị hủy.
 * - Chưa đăng nhập → giỏ theo token; chưa có thì tạo mới.
 * req.cartToken luôn tồn tại khi handler chạy.
 */
export async function attachCart(req: Request, res: Response, next: NextFunction) {
  let token = (req.cookies && (req.cookies as Record<string, string>)[COOKIE]) || '';
  const userId = req.auth?.id ?? null;

  if (userId) {
    let cart = await prisma.cart.findFirst({ where: { userId } });
    let claimed = false;

    if (!cart && token) {
      /* Điều kiện userId: null là mấu chốt. Trước đây chỉ tra theo token, nên một
         cookie còn sót sau khi đăng xuất có thể nhận nguyên giỏ của người khác làm
         của mình — hai tài khoản dùng chung một giỏ, chủ sở hữu nhấp nhô theo từng
         request vì Cart.userId là unique. */
      const guest = await prisma.cart.findFirst({ where: { token, userId: null } });
      if (guest) {
        // Hủy token luôn: giỏ của user không còn bút danh nào để cookie trỏ vào
        cart = await prisma.cart.update({ where: { id: guest.id }, data: { userId, token: null } });
        claimed = true;
      }
    }
    if (!cart) cart = await prisma.cart.create({ data: { userId } });

    /* Token đã bị tiêu thụ (hoặc chưa từng có) → cấp cookie khách mới, để lần đăng
       xuất sau không để lại định danh nào ánh xạ tới giỏ của user này. */
    if (claimed || !token) {
      token = crypto.randomUUID();
      res.cookie(COOKIE, token, COOKIE_OPTS);
    }
    req.cartToken = token;
    return next();
  }

  if (!token) {
    token = crypto.randomUUID();
    res.cookie(COOKIE, token, COOKIE_OPTS);
  }
  const existing = await prisma.cart.findUnique({ where: { token } });
  if (!existing) {
    await prisma.cart.create({ data: { token } });
  } else if (existing.userId !== null) {
    /* Cookie cũ còn sót đang trỏ vào giỏ của một tài khoản (dữ liệu tạo trước khi
       có bản vá này). Cắt liên kết: cấp token mới, để khách vãng lai có giỏ riêng
       trống thay vì nhìn thấy giỏ của người khác. */
    token = crypto.randomUUID();
    res.cookie(COOKIE, token, COOKIE_OPTS);
    await prisma.cart.create({ data: { token } });
  }
  req.cartToken = token;
  next();
}
