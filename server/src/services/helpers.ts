import type { Request } from 'express';

/** Fallback: đọc cookie NC_VID từ header nếu middleware chưa set (chỉ đọc, không ghi) */
export function authCookieToken(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'NC_VID') return decodeURIComponent(rest.join('='));
  }
  return undefined;
}
