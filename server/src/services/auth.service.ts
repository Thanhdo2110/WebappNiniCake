import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { envs } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { identityRepository as repo } from '../repositories/identity.repository.js';
import { cartRepository } from '../repositories/cart.repository.js';
import { fail } from '../utils/http.js';
import { userToDTO } from '../utils/dto.js';
import type { AuthUser } from '../middlewares/auth.middleware.js';

const REFRESH_COOKIE = 'NC_RT';

interface TokenSet {
  accessToken: string;
  refreshToken: string;
}

function signAccessToken(user: { id: number; email: string | null; role: string }): string {
  const payload: Record<string, unknown> = { sub: String(user.id), email: user.email, role: user.role };
  return jwt.sign(payload, envs.jwt.accessSecret, {
    expiresIn: envs.jwt.accessTtl as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: String(userId), jti: crypto.randomUUID() }, envs.jwt.refreshSecret, {
    expiresIn: envs.jwt.refreshTtl as jwt.SignOptions['expiresIn'],
  });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiresAtOf(token: string): Date {
  const payload = jwt.decode(token) as { exp?: number } | null;
  return payload?.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
}

export function issueSession(userId: number, email: string | null, role: string): TokenSet {
  const accessToken = signAccessToken({ id: userId, email, role });
  const refreshToken = signRefreshToken(userId);
  return { accessToken, refreshToken };
}

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}

export const authService = {
  async register(input: { fullName: string; phone: string; password: string }) {
    const existing = await repo.findByPhone(input.phone);
    if (existing) throw fail('Số điện thoại đã được đăng ký. Vui lòng dùng số khác hoặc đăng nhập.', 409);
    const customerRole = await repo.findRole('CUSTOMER');
    if (!customerRole) throw fail('Hệ thống chưa khởi tạo vai trò. Vui lòng seed dữ liệu.', 500);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await repo.createUser({
      roleId: customerRole.id,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
    });
    return user;
  },

  async login(input: { phone?: string; email?: string }, password: string) {
    const byPhone = Boolean(input.phone);
    const wrongCreds = byPhone ? 'Số điện thoại hoặc mật khẩu chưa đúng.' : 'Email hoặc mật khẩu chưa đúng.';
    const user = byPhone ? await repo.findByPhone(input.phone!) : await repo.findByEmail(input.email!);
    if (!user) throw fail(wrongCreds, 401);
    if (user.status === 'BLOCKED') throw fail('Tài khoản đã bị khóa. Vui lòng liên hệ tiệm.', 403);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw fail(wrongCreds, 401);
    return user;
  },

  /** Hợp nhất giỏ guest vào giỏ user khi đăng nhập */
  async mergeGuestCartToUser(userId: number, guestToken?: string) {
    if (!guestToken) return;
    const guestCart = await cartRepository.findByToken(guestToken);
    if (!guestCart || !guestCart.items.length) return;
    const userCart = await cartRepository.findByUser(userId);
    if (!userCart) {
      if (guestCart.userId === userId) return;
      return prisma.cart.update({ where: { id: guestCart.id }, data: { userId } });
    }
    for (const item of guestCart.items) {
      const optKey = item.options ? JSON.stringify(item.options) : '';
      const same = userCart.items.find(
        (i) => i.variantId === item.variantId && (i.options ? JSON.stringify(i.options) : '') === optKey
      );
      if (same) {
        await prisma.cartItem.update({
          where: { id: same.id },
          data: { quantity: Math.min(20, same.quantity + item.quantity) },
        });
      } else {
        await prisma.cartItem.create({
          data: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity, unitPrice: item.unitPrice, options: item.options ?? undefined },
        });
      }
    }
    await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
  },

  async refresh(refreshToken?: string): Promise<{ accessToken: string; user: Parameters<typeof userToDTO>[0]; refreshToken: string } | null> {
    if (!refreshToken) return null;
    let payload: { sub?: string };
    try {
      payload = jwt.verify(refreshToken, envs.jwt.refreshSecret) as { sub?: string };
    } catch {
      return null;
    }
    const record = await repo.findRefreshToken(hashToken(refreshToken));
    if (!record || record.revokedAt || record.expiresAt < new Date() || !payload.sub) return null;
    await repo.revokeRefreshToken(hashToken(refreshToken));
    const user = record.user;
    if (!user || user.status === 'BLOCKED' || user.deletedAt) return null;
    const tokens = issueSession(user.id, user.email, user.role?.name || 'CUSTOMER');
    await repo.saveRefreshToken(user.id, hashToken(tokens.refreshToken), expiresAtOf(tokens.refreshToken));
    return { accessToken: tokens.accessToken, user, refreshToken: tokens.refreshToken };
  },

  /** Lưu refresh token (hash SHA256) — dùng sau login/refresh */
  async saveRefresh(userId: number, refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await repo.saveRefreshToken(userId, hash, expiresAtOf(refreshToken));
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      jwt.verify(refreshToken, envs.jwt.refreshSecret);
    } catch {
      return;
    }
    await repo.revokeRefreshToken(hashToken(refreshToken));
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await repo.findById(userId);
    if (!user) throw fail('Không tìm thấy tài khoản.', 404);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw fail('Mật khẩu hiện tại chưa đúng.', 400);
    const hash = await bcrypt.hash(newPassword, 10);
    await repo.updatePassword(userId, hash);
    await repo.revokeAllUserTokens(userId);
  },

  /* Quên mật khẩu: mã code 6 số, lưu in-memory (TTL 10 phút), khóa theo số điện thoại */
  resetCodes: new Map<string, { code: string; expires: number }>(),

  async resetCodeOf(phone: string): Promise<string | null> {
    const user = await repo.findByPhone(phone);
    if (!user) return null;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.resetCodes.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 });
    return code;
  },

  async resetPassword(phone: string, code: string, newPassword: string) {
    const rec = this.resetCodes.get(phone);
    if (!rec || rec.expires < Date.now()) throw fail('Mã xác nhận đã hết hạn. Vui lòng thử lại.', 400);
    if (rec.code !== code) throw fail('Mã xác nhận chưa đúng.', 400);
    const user = await repo.findByPhone(phone);
    if (!user) throw fail('Không tìm thấy tài khoản.', 404);
    await repo.updatePassword(user.id, await bcrypt.hash(newPassword, 10));
    await repo.revokeAllUserTokens(user.id);
    this.resetCodes.delete(phone);
  },

  toAuthUser(user: { id: number; email: string | null; fullName: string; role: { name: string } | null }): AuthUser {
    return { id: user.id, email: user.email, role: user.role?.name || 'CUSTOMER', fullName: user.fullName };
  },

  REFRESH_COOKIE,
};
