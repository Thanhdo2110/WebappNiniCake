/** Báo cáo: doanh thu theo kỳ, khách mới, bánh bán chạy + tải CSV */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import type { TopProductDTO } from '@shared/types';
import { get } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { formatVND, toISODate, addDays } from '../lib/format';
import { Loading, PageTitle, Empty } from '../components/ui';
import { useToast } from '../hooks/toast';

interface RevenueReport { series: Array<{ label: string; revenue: number; orders: number }>; summary: { revenue: number; orders: number; from: string; to: string } }
interface CustomersReport { series: Array<{ label: string; count: number }>; count: number }

export default function ReportsPage() {
  const { toast } = useToast();
  const [from, setFrom] = useState(toISODate(addDays(-30)));
  const [to, setTo] = useState(toISODate(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [downloading, setDownloading] = useState(false);

  const params: Record<string, unknown> = { from, to, groupBy };

  const revQ = useQuery({
    queryKey: ['report-revenue', from, to, groupBy],
    queryFn: () => get<RevenueReport>('/admin/reports/revenue', params),
  });
  const custQ = useQuery({
    queryKey: ['report-customers', from, to, groupBy],
    queryFn: () => get<CustomersReport>('/admin/reports/customers', params),
  });
  const topQ = useQuery({
    queryKey: ['report-top', from, to],
    queryFn: () => get<TopProductDTO[]>('/admin/reports/top-products', { from, to, limit: 10 }),
  });

  const download = async (url: string, filename: string) => {
    setDownloading(true);
    try {
      await downloadCsv(url, filename, { from, to });
      toast(`Đã tải ${filename}.`, 'ok');
    } catch {
      toast(`Không tải được ${filename}.`, 'err');
    } finally {
      setDownloading(false);
    }
  };

  const shortRange = (days: number) => { setFrom(toISODate(addDays(days))); setTo(toISODate(new Date())); };
  const setPeriod = (p: 'day' | 'week' | 'month') => setGroupBy(p);

  return (
    <>
      <PageTitle title="Báo cáo kinh doanh"
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" disabled={downloading} onClick={() => download('/admin/reports/revenue.csv', 'nini-doanh-thu.csv')}>CSV doanh thu</button>
            <button className="btn btn-outline btn-sm" disabled={downloading} onClick={() => download('/admin/reports/top-products.csv', 'nini-banh-ban-chay.csv')}>CSV bán chạy</button>
            <button className="btn btn-outline btn-sm" disabled={downloading} onClick={() => download('/admin/reports/orders.csv', 'nini-don-hang.csv')}>CSV đơn hàng</button>
            <button className="btn btn-outline btn-sm" disabled={downloading} onClick={() => download('/admin/reports/customers.csv', 'nini-khach-hang.csv')}>CSV khách hàng</button>
          </div>
        } />

      <div className="filter-bar card pad">
        <label className="check-row small">Từ <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="check-row small">Đến <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <select className="select" value={groupBy} onChange={(e) => { setPeriod(e.target.value as 'day' | 'week' | 'month'); }}>
          <option value="day">Gộp theo ngày</option>
          <option value="week">Gộp theo tuần</option>
          <option value="month">Gộp theo tháng</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => shortRange(-7)}>7 ngày</button>
        <button className="btn btn-outline btn-sm" onClick={() => shortRange(-30)}>30 ngày</button>
        <button className="btn btn-outline btn-sm" onClick={() => shortRange(-90)}>90 ngày</button>
      </div>

      {revQ.isLoading ? <Loading text="Đang cộng sổ báo cáo..." /> : revQ.isError || !revQ.data ? (
        <Empty title="Không tính được báo cáo" children={<p className="small muted">Kiểm tra lại khoảng thời gian rồi thử lại.</p>} />
      ) : (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <span className="small muted">Doanh thu kỳ này</span>
              <span className="v">{formatVND(revQ.data.summary.revenue)}</span>
            </div>
            <div className="card stat-card">
              <span className="small muted">Số đơn kỳ này</span>
              <span className="v">{revQ.data.summary.orders}</span>
            </div>
            <div className="card stat-card">
              <span className="small muted">Khách mới kỳ này</span>
              <span className="v">{custQ.data?.count ?? '—'}</span>
            </div>
          </div>

          <div className="card pad" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Đường doanh thu ({from} → {to})</h3>
            {revQ.data.series.length === 0 ? <p className="small muted">Chưa có đơn nào trong kỳ.</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revQ.data.series} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9a96e" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#c9a96e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eadfd1" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={56} />
                  <Tooltip formatter={(v: number | string) => formatVND(Number(v))} labelStyle={{ fontWeight: 700 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#a4813d" strokeWidth={2} fill="url(#repRev)" name="Doanh thu" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
            <div className="card pad">
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Bánh bán chạy nhất trong kỳ</h3>
              {topQ.isLoading ? <Loading text="Đang đếm phần bán..." /> : (topQ.data || []).length === 0 ? (
                <Empty title="Chưa có dữ liệu bán trong kỳ này" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={(topQ.data || []).slice(0, 8)} layout="vertical" margin={{ left: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eadfd1" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number | string, n) => n === 'qty' ? `${v} phần` : formatVND(Number(v))} />
                      <Bar dataKey="qty" fill="#c9a96e" name="Số phần bán" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>#</th><th>Sản phẩm</th><th>Số phần</th><th className="right">Doanh thu</th></tr></thead>
                      <tbody>
                        {(topQ.data || []).map((t, i) => (
                          <tr key={t.productId}>
                            <td>{i + 1}</td>
                            <td>{t.name}</td>
                            <td>{t.qty}</td>
                            <td className="right" style={{ fontWeight: 700 }}>{formatVND(t.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="card pad">
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Khách mới đăng ký</h3>
              {custQ.isLoading ? <Loading text="Đang đếm khách..." /> : custQ.data && custQ.data.series.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={custQ.data.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eadfd1" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                    <Tooltip formatter={(v: number | string) => `${v} khách`} labelStyle={{ fontWeight: 700 }} />
                    <Bar dataKey="count" fill="#8a6d55" name="Khách mới" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty title="Chưa có khách mới trong kỳ" />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
