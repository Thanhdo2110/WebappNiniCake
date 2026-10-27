import { Request } from 'express';

export interface Paging {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export const DEFAULT_PER_PAGE = 12;
export const MAX_PER_PAGE = 50;

export function parsePaging(req: Request, defaultPerPage = DEFAULT_PER_PAGE): Paging {
  const pageRaw = parseInt(String(req.query.page ?? '1'), 10);
  const perRaw = parseInt(String(req.query.perPage ?? String(defaultPerPage)), 10);
  const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);
  let perPage = Math.max(1, Number.isNaN(perRaw) ? defaultPerPage : perRaw);
  if (perPage > MAX_PER_PAGE) perPage = MAX_PER_PAGE;
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function parseIdList(value: unknown): number[] {
  if (!value) return [];
  const str = Array.isArray(value) ? value.join(',') : String(value);
  return str
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function buildMeta(totalItems: number, page: number, perPage: number) {
  return {
    page,
    perPage,
    totalItems,
    totalPages: Math.ceil(totalItems / perPage),
    hasNext: page * perPage < totalItems,
    hasPrev: page > 1,
  };
}
