/** Danh sách đơn (admin): tra cứu + lọc trạng thái/ngày + việt đặt nhanh */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderDTO, Paginated } from '@shared/types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, DELIVERY_TYPE_LABEL } from '@shared';
import { get } from '../lib/api';
import { formatVND, formatDateTime, formatDate } from '../lib/format';
import { Loading, PageTitle, Empty, Pager } from '../components/ui';

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admin-orders', { search, status, from, to, page }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, perPage: 12 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (from) params.from = from;
      if (to) params.to = to;
      return get<Paginated<OrderDTO>>('/admin/orders', params);
    },
  });

  const items = query.data?.items || [];

  return (
    <>
      <PageTitle title="Đơn hàng" action={<button className="btn btn-primary btn-sm" onClick={() => query.refetch()}>Làm mới</button>} />

      <div className="filter-bar card pad">
        <input className="input" placeholder="Mã đơn / tên / SĐT người nhận" value={search} style={{ minWidth: 240 }}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === '' ? 'Tất cả trạng thái' : ORDER_STATUS_LABEL[s as keyof typeof ORDER_STATUS_LABEL]}</option>)}
        </select>
        <label className="check-row small">Từ <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="check-row small">Đến <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </div>

      {query.isLoading ? <Loading text="Đang lấy sổ đơn..." /> : items.length === 0 ? (
        <Empty title="Không có đơn nào khớp bộ lọc" />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã đơn</th><th>Khách / người nhận</th><th>Nhận bánh</th><th>Trạng thái</th><th>Thanh toán</th><th className="right">Tổng</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700 }}>
                      <Link to={`/orders/${o.id}`} style={{ color: 'var(--cocoa)' }}>#{o.code}</Link>
                      <div className="small muted">{formatDateTime(o.createdAt)}</div>
                    </td>
                    <td className="small">
                      {o.user?.fullName && <div><b>{o.user.fullName}</b></div>}
                      {o.recipientName} • {o.recipientPhone}
                    </td>
                    <td className="small">
                      {DELIVERY_TYPE_LABEL[o.deliveryType]}
                      <div className="small muted">{formatDate(o.deliveryDate)} • {o.timeSlot}</div>
                    </td>
                    <td><span className="tag" style={{ background: `${ORDER_STATUS_COLOR[o.status]}22`, color: ORDER_STATUS_COLOR[o.status], fontWeight: 700 }}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                    <td className="small">{o.paymentMethod === 'COD' ? 'COD' : 'Chuyển khoản'}<div className="small muted">{o.paymentStatus}</div></td>
                    <td className="right" style={{ fontWeight: 700 }}>{formatVND(o.total)}</td>
                    <td><Link className="btn btn-outline btn-sm" to={`/orders/${o.id}`}>Xử lý</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data && <Pager meta={query.data.meta} page={page} onPage={setPage} />}
        </>
      )}
    </>
  );
}
