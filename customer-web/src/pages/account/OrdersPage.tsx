/** Danh sách đơn của khách hàng: lọc theo trạng thái + nhanh hủy */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ban } from 'lucide-react';
import type { OrderDTO, Paginated } from '@shared/types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, DELIVERY_TYPE_LABEL } from '@shared';
import { formatVND, formatDateTime, formatDate } from '../../lib/format';
import { get, post, errMessage } from '../../lib/api';
import { EmptyState, LoadingBlock, Reveal, Stagger, StatusPill } from '../../components/ui';
import { useToast } from '../../hooks/toast';

const tabs = [
  { v: '', label: 'Tất cả' },
  ...Object.entries(ORDER_STATUS_LABEL).map(([v, label]) => ({ v, label })),
];

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['orders', status, page],
    queryFn: () => get<Paginated<OrderDTO>>('/orders', { page, perPage: 10, status: status || undefined }),
  });

  const cancelM = useMutation({
    mutationFn: (o: OrderDTO) => post(`/orders/${o.id}/cancel`, { reason: 'Khách thay đổi kế hoạch' }),
    onSuccess: () => {
      toast('Đã hủy đơn. Nếu muốn đặt lại, tiệm luôn sẵn sàng!', 'ok');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = query.data?.items || [];

  return (
    <div className="account-page">
      <Reveal as="div" className="account-page__head">
        <div>
          <span className="eyebrow">Sổ đơn</span>
          <h3 className="account-page__title">Đơn bánh của tôi</h3>
        </div>
        <Link to="/banh" className="btn btn-soft btn-sm">
          Đặt thêm bánh <ArrowRight size={14} className="btn-ico" />
        </Link>
      </Reveal>

      <div className="tab-row" aria-label="Lọc theo trạng thái">
        {tabs.map((t) => (
          <button key={t.v} type="button" aria-pressed={status === t.v}
            className={`tab${status === t.v ? ' is-active' : ''}`}
            onClick={() => { setStatus(t.v); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading && <LoadingBlock text="Đang lấy sổ đơn..." />}

      {!query.isLoading && items.length === 0 && (
        <EmptyState icon="🧾" title="Chưa có đơn nào trong mục này">
          <Link to="/banh" className="btn btn-gold btn-sm">Chọn bánh đầu tiên</Link>
        </EmptyState>
      )}

      <Stagger className="order-list">
        {items.map((o) => (
          <article key={o.id} className="card order-row">
            <div className="order-row__main">
              <div className="order-row__code">
                <b>#{o.code}</b>
                <StatusPill color={ORDER_STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</StatusPill>
              </div>
              <div className="small muted">
                {DELIVERY_TYPE_LABEL[o.deliveryType]} • {o.recipientName} • {o.timeSlot}
              </div>
              <div className="small faint">{formatDateTime(o.createdAt)}</div>
            </div>
            <div className="order-row__side">
              <div className="order-row__total">{formatVND(o.total)}</div>
              <div className="small muted">{o.items.length} món • nhận ngày {formatDate(o.deliveryDate)}</div>
            </div>
            <div className="order-row__actions">
              <Link to={`/tai-khoan/don-hang/${o.id}`} className="btn btn-soft btn-sm">
                Chi tiết <ArrowRight size={14} className="btn-ico" />
              </Link>
              {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => cancelM.mutate(o)} disabled={cancelM.isPending}>
                  <Ban size={14} /> Hủy
                </button>
              )}
            </div>
          </article>
        ))}
      </Stagger>
    </div>
  );
}
