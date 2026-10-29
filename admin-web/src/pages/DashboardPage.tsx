/** Tổng quan: số liệu nhanh + đường doanh thu + tồn thấp + bánh bán chạy + đơn mới */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import type { DashboardDTO } from '@shared/types';
import { get } from '../lib/api';
import { formatVND, formatDate } from '../lib/format';
import { Loading, PageTitle, Empty } from '../components/ui';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@shared';

export default function DashboardPage() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => get<DashboardDTO>('/admin/dashboard') });

  if (q.isLoading) return <Loading text="Đang cộng sổ..." />;
  if (q.isError || !q.data) return <Empty title="Không tải được số liệu cho dashboard" />;

  const d = q.data;
  const cards = [
    { label: 'Doanh thu hôm nay', v: formatVND(d.revenueToday) },
    { label: 'Doanh thu tháng này', v: formatVND(d.revenueMonth) },
    { label: 'Đơn mới hôm nay', v: String(d.ordersNewToday) },
    { label: 'Đơn chờ xác nhận', v: String(d.ordersPending) },
    { label: 'Khách mới tháng này', v: String(d.customersNewMonth) },
  ];

  return (
    <>
      <PageTitle title="Tổng quan tiệm" action={<Link to="/orders" className="btn btn-outline btn-sm">Mở danh sách đơn →</Link>} />

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="card stat-card">
            <span className="small muted">{c.label}</span>
            <span className="v">{c.v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card pad">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Doanh thu 14 ngày gần nhất</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.revenueSeries} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a96e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#c9a96e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eadfd1" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v: number | string) => formatVND(Number(v))} labelStyle={{ fontWeight: 700 }} />
              <Area type="monotone" dataKey="revenue" stroke="#a4813d" strokeWidth={2} fill="url(#rev)" name="Doanh thu" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card pad">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Bánh bán chạy (30 ngày)</h3>
          {d.topProducts.length === 0 ? <Empty title="Chưa có dữ liệu bán" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.topProducts.slice(0, 6)} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eadfd1" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number | string, n) => n === 'qty' ? `${v} phần` : formatVND(Number(v))} />
                <Bar dataKey="qty" fill="#c9a96e" name="Số phần" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

        <div className="card pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 15 }}>Đơn gần đây</h3>
            <Link to="/orders" className="small" style={{ color: 'var(--champagne)' }}>Tất cả →</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Mã</th><th>Khách</th><th>Nhận</th><th>Thanh toán</th><th className="right">Tổng</th></tr></thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.id}`} style={{ fontWeight: 700, color: 'var(--cocoa)' }}>#{o.code}</Link></td>
                    <td>{o.recipientName}{o.customerEmail && <div className="small muted">{o.customerEmail}</div>}</td>
                    <td className="small">
                      <span style={{ color: ORDER_STATUS_COLOR[o.status], fontWeight: 700 }}>{ORDER_STATUS_LABEL[o.status]}</span>
                      <div className="small muted">{formatDate(o.deliveryDate)} • {o.timeSlot}</div>
                    </td>
                    <td className="small">{o.paymentMethod === 'COD' ? 'COD' : 'CK'}<div className="small muted">{o.paymentStatus}</div></td>
                    <td className="right" style={{ fontWeight: 700 }}>{formatVND(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </>
  );
}
