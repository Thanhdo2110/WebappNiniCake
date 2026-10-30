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
