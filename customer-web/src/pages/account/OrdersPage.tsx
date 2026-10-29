/** Danh sách đơn của khách hàng: lọc theo trạng thái + phân trang + hủy có xác nhận */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ban, RotateCcw } from 'lucide-react';
import type { OrderDTO, Paginated } from '@shared/types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, DELIVERY_TYPE_LABEL, isAwaitingPayment } from '@shared';
import { formatVND, formatDateTime, formatDate } from '../../lib/format';
import { get, post, errMessage } from '../../lib/api';
import { EmptyState, LoadingBlock, Reveal, Stagger, StatusPill } from '../../components/ui';
import { ConfirmDialog } from '../../components/Overlay';
import { Pagination } from '../../components/Pagination';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

const tabs = [
  { v: '', label: 'Tất cả' },
  ...Object.entries(ORDER_STATUS_LABEL).map(([v, label]) => ({ v, label })),
];

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<OrderDTO | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  useSeo({ title: 'Đơn hàng của tôi', description: 'Theo dõi trạng thái các đơn bánh bạn đã đặt tại Nini Cakes.' });

  const query = useQuery({
    queryKey: ['orders', status, page],
    queryFn: () => get<Paginated<OrderDTO>>('/orders', { page, perPage: 10, status: status || undefined }),
    placeholderData: (prev) => prev,
  });

  const cancelM = useMutation({
    mutationFn: (o: OrderDTO) => post(`/orders/${o.id}/cancel`, { reason: 'Khách thay đổi kế hoạch' }),
    onSuccess: () => {
      toast('Đã hủy đơn. Nếu muốn đặt lại, tiệm luôn sẵn sàng!', 'ok');
      setCancelTarget(null);
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

      <div className="tab-row" role="tablist" aria-label="Lọc theo trạng thái">
        {tabs.map((t) => (
          <button key={t.v} type="button" role="tab" aria-selected={status === t.v}
            className={`tab${status === t.v ? ' is-active' : ''}`}
            onClick={() => { setStatus(t.v); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading && <LoadingBlock text="Đang lấy sổ đơn..." />}

      {query.isError && (
        <EmptyState icon="🫖" title="Chưa mở được sổ đơn">
          <p className="small muted">{errMessage(query.error, 'Kết nối đến tiệm bị gián đoạn.')}</p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => query.refetch()}>
            <RotateCcw size={14} /> Thử lại
          </button>
        </EmptyState>
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <EmptyState icon="🧾" title="Chưa có đơn nào trong mục này">
          <Link to="/banh" className="btn btn-gold btn-sm">Chọn bánh đầu tiên</Link>
        </EmptyState>
      )}

      <Stagger className={`order-list${query.isFetching ? ' is-refreshing' : ''}`}>
        {items.map((o) => (
          <article key={o.id} className="card order-row">
            <div className="order-row__main">
              <div className="order-row__code">
                <b>#{o.code}</b>
                <StatusPill color={isAwaitingPayment(o) ? '#BF8A3C' : ORDER_STATUS_COLOR[o.status]}>
                  {isAwaitingPayment(o) ? 'Chờ thanh toán' : ORDER_STATUS_LABEL[o.status]}
                </StatusPill>
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
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelTarget(o)}>
                  <Ban size={14} /> Hủy
                </button>
              )}
            </div>
          </article>
        ))}
      </Stagger>

      {query.data && !query.isError && (
        <Pagination meta={query.data.meta} page={page} onPage={setPage} />
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelM.mutate(cancelTarget)}
        title={`Hủy đơn #${cancelTarget?.code ?? ''}?`}
        message="Đơn sẽ được lấy ra khỏi bếp và không thể khôi phục. Nếu đã chuyển khoản, tiệm sẽ hoàn tiền sau khi kiểm tra."
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn lại"
        danger
        pending={cancelM.isPending}
      />
    </div>
  );
}
