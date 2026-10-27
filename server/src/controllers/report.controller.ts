import type { Request, Response } from 'express';
import { reportService } from '../services/report.service.js';
import { bindController, success } from '../utils/http.js';
import { csvResponse } from '../utils/csv.js';
import type { Granularity } from '../services/report.service.js';

function safeGranularity(req: Request): Granularity {
  const v = (req.query.groupBy || 'day').toString();
  return v === 'week' ? 'week' : v === 'month' ? 'month' : 'day';
}

export const reportController = bindController({
  async dashboard(_req: Request, res: Response) {
    return success(res, await reportService.dashboard());
  },
  async revenue(req: Request, res: Response) {
    const from = (req.query.from as string) || defaultDayRange(-30).from;
    const to = (req.query.to as string) || defaultDayRange(-30).to;
    return success(res, await reportService.revenueSeries(from, to, safeGranularity(req)));
  },
  async customers(req: Request, res: Response) {
    const from = (req.query.from as string) || defaultDayRange(-90).from;
    const to = (req.query.to as string) || defaultDayRange(-90).to;
    return success(res, await reportService.customersSeries(from, to, safeGranularity(req)));
  },
  async revenueCsv(req: Request, res: Response) {
    const from = (req.query.from as string) || defaultDayRange(-30).from;
    const to = (req.query.to as string) || defaultDayRange(-30).to;
    const csv = await reportService.revenueCsv(from, to, safeGranularity(req));
    return csvResponse(res, `nini-revenue-${from}_to_${to}.csv`, csv);
  },
  async topProducts(req: Request, res: Response) {
    const from = (req.query.from as string) || defaultDayRange(-30).from;
    const to = (req.query.to as string) || defaultDayRange(-30).to;
    const rows = await reportService.topProductsRaw(new Date(`${from}T00:00:00+07:00`), new Date(`${to}T23:59:59+07:00`), Number(req.query.limit) || 10);
    return success(
      res,
      rows.map((r) => ({ productId: Number(r.productId), name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) }))
    );
  },
  async topProductsCsv(req: Request, res: Response) {
    const from = (req.query.from as string) || defaultDayRange(-30).from;
    const to = (req.query.to as string) || defaultDayRange(-30).to;
    return csvResponse(res, `nini-top-products-${from}_to_${to}.csv`, await reportService.topProductsCsv(from, to));
  },
  async ordersCsv(req: Request, res: Response) {
    const from = (req.query.from as string) || defaultDayRange(-30).from;
    const to = (req.query.to as string) || defaultDayRange(-30).to;
    return csvResponse(res, `nini-orders-${from}_to_${to}.csv`, await reportService.ordersCsv(from, to));
  },
  async customersCsv(req: Request, res: Response) {
    return csvResponse(res, 'nini-customers.csv', await reportService.customersCsv());
  },
});

function defaultDayRange(daysBack: number): { from: string; to: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const from = new Date(now.getTime() + daysBack * 24 * 3600 * 1000);
  return { from: fmt(from), to: fmt(now) };
}
