import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';

/**
 * Gán giỏ hàng theo cookie:
 * - Có access token hợp lệ (đã qua optionalAuth) → giỏ theo user.
 * - Chưa đăng nhập → giỏ theo token trong cookie NC_VID; nếu chưa có thì cấp mới.
 * req.cartToken được đảm bảo tồn tại khi handler chạy.
 */
export async function attachCart(req: Request, res: Response, next: NextFunction) {
  const COOKIE = 'NC_VID';
  let token = (req.cookies && (req.cookies as Record<string, string>)[COOKIE]) || '';
  const userId = req.auth?.id ?? null;

  if (userId) {
    // Ưu tiên giỏ theo user - hợp nhất giỏ guest nếu có
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      if (token) {
        cart = await prisma.cart.findUnique({ where: { token } });
        if (cart) {
          cart = await prisma.cart.update({ where: { id: cart.id }, data: { userId } });
        }
      }
      if (!cart) {
        cart = await prisma.cart.create({ data: { token: token || crypto.randomUUID(), userId } });
      }
    }
    void cart;
    if (!token) {
      token = crypto.randomUUID();
      res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 3600 * 1000 });
    }
    req.cartToken = token;
    return next();
  }

  if (!token) {
    token = crypto.randomUUID();
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 3600 * 1000 });
  }
  const cart = await prisma.cart.upsert({
    where: { token },
    update: {},
    create: { token },
  });
  void cart;
  req.cartToken = token;
  next();
}
