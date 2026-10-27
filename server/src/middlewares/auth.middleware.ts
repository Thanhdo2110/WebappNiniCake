import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { envs } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { fail } from '../utils/http.js';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  fullName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
      cartToken?: string;
    }
  }
}

/* Giải mã Bearer header (dùng riêng cho requireStaff/requireAdmin khi route không có requireAuth phía trước) */
async function authFromHeader(req: Request): Promise<'ok' | 'none' | 'invalid'> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return 'none';
  try {
    const payload = jwt.verify(token, envs.jwt.accessSecret) as { sub: string };
    const user = await prisma.user.findFirst({
      where: { id: Number(payload.sub), deletedAt: null },
      include: { role: true },
    });
    if (!user || user.status === 'BLOCKED') return 'invalid';
    req.auth = { id: user.id, email: user.email, role: user.role?.name || 'CUSTOMER', fullName: user.fullName };
    return 'ok';
  } catch {
    return 'invalid';
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(fail('Bạn cần đăng nhập để tiếp tục.', 401));
  try {
    const payload = jwt.verify(token, envs.jwt.accessSecret) as { sub: string; role: string; email: string };
    const user = await prisma.user.findFirst({
      where: { id: Number(payload.sub), deletedAt: null },
      include: { role: true },
    });
    if (!user) return next(fail('Tài khoản không tồn tại.', 401));
    if (user.status === 'BLOCKED') return next(fail('Tài khoản đã bị khóa. Vui lòng liên hệ tiệm.', 403));
    req.auth = { id: user.id, email: user.email, role: user.role?.name || 'CUSTOMER', fullName: user.fullName };
    next();
  } catch {
    return next(fail('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 401));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next();
  try {
    const payload = jwt.verify(token, envs.jwt.accessSecret) as { sub: string; role: string; email: string };
    prisma.user
      .findFirst({ where: { id: Number(payload.sub), deletedAt: null }, include: { role: true } })
      .then((user) => {
        if (user && user.status !== 'BLOCKED') {
          req.auth = { id: user.id, email: user.email, role: user.role?.name || 'CUSTOMER', fullName: user.fullName };
        }
        next();
      })
      .catch(() => next());
  } catch {
    next();
  }
}

export async function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth && (await authFromHeader(req)) === 'invalid') {
    return next(fail('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 401));
  }
  if (!req.auth) return next(fail('Bạn cần đăng nhập tài khoản quản trị.', 401));
  if (req.auth.role !== 'ADMIN' && req.auth.role !== 'STAFF') {
    return next(fail('Chỉ nhân viên/admin mới được thực hiện chức năng này.', 403));
  }
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth && (await authFromHeader(req)) === 'invalid') {
    return next(fail('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 401));
  }
  if (!req.auth) return next(fail('Bạn cần đăng nhập tài khoản quản trị.', 401));
  if (req.auth.role !== 'ADMIN') {
    return next(fail('Chỉ admin mới được thực hiện chức năng này.', 403));
  }
  next();
}
