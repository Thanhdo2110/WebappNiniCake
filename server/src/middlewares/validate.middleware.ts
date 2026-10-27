import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validate middleware: kiểm tra body / query / params theo schema Zod.
 * Kết quả validate gán đè vào req (đã cast về đúng kiểu).
 */
export function validate(
  schema: ZodTypeAny,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const target = req[source] as unknown;
    try {
      const parsed = schema.parse(target);
      const holder = req as unknown as Record<string, unknown>;
      holder[source] = parsed;
      // Đưa kết quả vào req.body để controller đọc thống nhất qua req.body
      if (source !== 'body') {
        req.body = { ...(req.body || {}), ...parsed } as typeof req.body;
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}
