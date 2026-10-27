/** Chuẩn hóa phản hồi JSON cho toàn bộ API */
import type { NextFunction, Request, Response } from 'express';

export interface ApiErrors {
  [field: string]: string[];
}

export class ApiError extends Error {
  status: number;
  messageKeyVi: string;
  errors?: ApiErrors;
  constructor(message: string, status = 500, errors?: ApiErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messageKeyVi = message;
    this.errors = errors;
  }
}

export const fail = (message: string, status = 400, errors?: ApiErrors) =>
  new ApiError(message, status, errors);

export interface SendOptions {
  message?: string;
}

export interface ResBase extends Response {
  api?: { message?: string };
}

export function success<T>(res: Response, data: T, message?: string) {
  return res.status(200).json({ success: true, data, ...(message ? { message } : {}) });
}

export function created<T>(res: Response, data: T, message = 'Đã tạo thành công.') {
  return res.status(201).json({ success: true, data, message });
}

type AsyncHandlerFn<Req extends Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler = <Req extends Request>(fn: AsyncHandlerFn<Req>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req as Req, res, next)).catch(next);
  };

/** Express 4 không tự catch promise rejection → bọc mọi handler để lỗi rơi vào error middleware */
export function bindController<T extends Record<string, unknown>>(controller: T): T {
  const wrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(controller)) {
    wrapped[key] =
      typeof value === 'function'
        ? (req: Request, res: Response, next: NextFunction) => {
            try {
              Promise.resolve((value as (r: Request, s: Response, n: NextFunction) => unknown)(req, res, next)).catch(next);
            } catch (syncErr) {
              next(syncErr);
            }
          }
        : value;
  }
  return wrapped as T;
}

/** Chuyển Prisma Decimal/BigInt về JSON-safe */
export function jsonSafe<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
  ) as T;
}
