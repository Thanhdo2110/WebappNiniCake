import type { NextFunction, Request, Response } from 'express';
import { ApiError, fail } from '../utils/http.js';
import { ZodError } from 'zod';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên được yêu cầu.' });
}

/** Xử lý lỗi tập trung: ApiError | ZodError | Prisma | khác */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.messageKeyVi,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.length ? issue.path.join('.') : '_';
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    return res.status(422).json({
      success: false,
      message: 'Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.',
      errors,
    });
  }

  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e && e.code === 'P2002') {
    const raw = e.meta?.target;
    const target = (Array.isArray(raw) ? raw : raw ? [raw] : []).join(', ');
    return res.status(409).json({
      success: false,
      message: target.includes('email')
        ? 'Email đã được đăng ký. Vui lòng dùng email khác.'
        : `Giá trị đã tồn tại${target ? ` (${target})` : ''}.`,
    });
  }
  if (e && e.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu cần cập nhật.' });
  }

   
  console.error('[API][UnhandledError]', err);
  return res.status(500).json({ success: false, message: 'Có lỗi tại hệ thống. Xin quý khách vui lòng thử lại.' });
}

export const rush404 = () => fail('Không tìm thấy tài nguyên được yêu cầu.', 404);
