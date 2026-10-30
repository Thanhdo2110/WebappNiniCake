/** Chi tiết đơn của khách: dòng bánh, tiến trình trạng thái động, hóa đơn in được, đặt lại đơn */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Check, CreditCard, MapPin, Printer, RotateCcw, Sparkles } from 'lucide-react';
import type { OrderDTO, StoreSettingsDTO } from '@shared/types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, DELIVERY_TYPE_LABEL, isAwaitingPayment } from '@shared';
import type { CSSProperties } from 'react';
import { formatVND, formatDateTime, formatDate } from '../../lib/format';
import { imageUrl, imgFallback } from '../../lib/placeholder';
import { get, post, errMessage } from '../../lib/api';
import { mapsLink } from '../../lib/geo';
import { EmptyState, LoadingBlock, Reveal, StatusPill } from '../../components/ui';
import { ConfirmDialog } from '../../components/Overlay';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

/** Chuỗi mốc trạng thái hiển thị đường tiến trình (PICKUP không qua SHIPPED) */
const FLOW: Array<Array<'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SHIPPED' | 'COMPLETED'>> = [
  ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'COMPLETED'],
  ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const justPaid = params.get('paid') === '1';
  const [cancelOpen, setCancelOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  useSeo({ title: 'Chi tiết đơn hàng' });

  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => get<StoreSettingsDTO>('/settings') });
  const query = useQuery({
    queryKey: ['order', id],
    queryFn: () => get<OrderDTO>(`/orders/${id}`),
  });

  const cancelM = useMutation({
    mutationFn: () => post(`/orders/${id}/cancel`, { reason: 'Khách hủy từ trang chi tiết' }),
    onSuccess: () => {
      toast('Đã hủy đơn. Tiệm sẽ hoàn tiền nếu bạn đã chuyển khoản trước đó (sau kiểm tra).', 'ok');
      setCancelOpen(false);
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  /* Đặt lại đơn: thêm từng món (còn bán) vào giỏ, kèm lời chúc/ghi chú cũ */
  const reorderM = useMutation({
    mutationFn: async (o: OrderDTO) => {
      const addable = o.items.filter((it) => it.variantId !== null);
      if (addable.length === 0) throw new Error('Đơn này không còn món nào có thể đặt lại.');
      const results = await Promise.allSettled(
        addable.map((it) =>
          post('/cart/items', {
            variantId: it.variantId,
            quantity: it.quantity,
            options: (it.options as { messageOnCake?: string; notes?: string; referenceImageUrl?: string }) ?? undefined,
          })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { total: addable.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      if (failed === 0) toast(`Đã thêm lại ${total} món vào giỏ — kiểm tra rồi chốt đơn nhé!`, 'ok');
      else toast(`Đã thêm ${total - failed}/${total} món; có món hết hàng hoặc ngừng bán.`, 'err');
      window.dispatchEvent(new CustomEvent('nc:open-cart'));
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  if (query.isLoading) return <LoadingBlock text="Đang lấy đơn..." />;
  if (query.isError || !query.data) {
    return <EmptyState icon="🔍" title="Không tìm thấy đơn này">
      <Link to="/tai-khoan/don-hang" className="btn btn-primary btn-sm">Về danh sách đơn</Link>
    </EmptyState>;
  }

  const o = query.data;
  const isPickup = o.deliveryType === 'PICKUP';
  const flow = FLOW[isPickup ? 1 : 0];
  const idx = flow.indexOf(o.status as 'PENDING');
  const s = settingsQ.data;
  const pct = flow.length > 1 ? Math.max(0, Math.min(1, idx / (flow.length - 1))) * 100 : 0;

  return (
    <div className="order-detail">
      {justPaid && o.paymentStatus === 'PAID' && (
        <Reveal from="scale" className="card welcome-card welcome-card--paid">
          <span className="welcome-card__icon"><Check size={18} /></span>
          <div>
            <h3>Đã nhận đủ thanh toán</h3>
            <p className="small muted">Tiệm đã xác nhận tiền cho đơn #{o.code} và đang chuẩn bị bánh.</p>
          </div>
        </Reveal>
      )}
      {welcome && o.status === 'PENDING' && !isAwaitingPayment(o) && (
        <Reveal from="scale" className="card welcome-card">
          <span className="welcome-card__icon"><Sparkles size={18} /></span>
          <div>
            <h3>Đặt bánh thành công!</h3>
            <p className="small muted">
              Bếp đã nhận đơn #{o.code}. Bạn giữ mã đơn này để tiện đối chiếu khi nhận bánh.
            </p>
          </div>
        </Reveal>
      )}

      <div className="order-detail__head">
        <div>
          <span className="eyebrow">Đơn hàng</span>
          <h3 className="order-detail__code">
            #{o.code} <StatusPill color={isAwaitingPayment(o) ? '#BF8A3C' : ORDER_STATUS_COLOR[o.status]}>
              {isAwaitingPayment(o) ? 'Chờ thanh toán' : ORDER_STATUS_LABEL[o.status]}
            </StatusPill>
          </h3>
          <div className="small muted">Đặt {formatDateTime(o.createdAt)}</div>
        </div>
        <div className="order-detail__tools">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> In hóa đơn
          </button>
          {(o.status === 'COMPLETED' || o.status === 'CANCELLED') && (
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={() => reorderM.mutate(o)}
              disabled={reorderM.isPending}
            >
              <RotateCcw size={14} /> {reorderM.isPending ? 'Đang thêm vào giỏ…' : 'Mua lại đơn này'}
            </button>
          )}
          {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelOpen(true)}>Hủy đơn</button>
          )}
        </div>
      </div>

      <Reveal as="div" className="card pad flow-card">
        {o.status === 'CANCELLED' ? (
          <p className="small flow-cancelled">
            Đơn đã hủy{o.cancelReason ? ` — ${o.cancelReason}` : ''}
          </p>
        ) : (
          <div className="flow" style={{ '--pct': pct } as CSSProperties}>
            <span className="flow__line" aria-hidden />
            <span className="flow__line is-fill" aria-hidden />
            {flow.map((st, i) => (
              <div key={st} className={`flow__step${i <= idx ? ' is-done' : ''}${i === idx ? ' is-current' : ''}`}>
                <span className="flow__dot">
                  {i < idx ? <Check size={14} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className="flow__label">{ORDER_STATUS_LABEL[st]}</span>
              </div>
            ))}
          </div>
        )}
      </Reveal>

      <div className="order-grid">
        <Reveal as="div" className="card pad">
          <h4>Bánh trong đơn</h4>
          <div className="order-items">
            {o.items.map((it) => (
              <div key={it.id} className="order-item">
                <span className="order-item__media img-frame">
                  <img src={imageUrl(it.imageUrl, it.name)} onError={imgFallback(it.name)} alt={it.name} loading="lazy" />
                </span>
                <div className="order-item__body">
                  <b className="small">{it.quantity}× {it.name}</b>
                  <div className="small muted">{it.variantName}</div>
                  {typeof it.options?.messageOnCake === 'string' && (
                    <div className="order-item__msg">Lời chúc: “{it.options.messageOnCake}”</div>
                  )}
                </div>
                <b className="small order-item__price">{formatVND(it.lineTotal)}</b>
              </div>
            ))}
          </div>

          <table className="table totals-table">
            <tbody>
              <tr><td>Thành tiền</td><td>{formatVND(o.subtotal)}</td></tr>
              {o.discount > 0 && <tr><td>Giảm giá {o.couponCode && `(${o.couponCode})`}</td><td className="is-ok">− {formatVND(o.discount)}</td></tr>}
              <tr><td>Phí giao / nhận</td><td>{o.shippingFee === 0 ? 'Miễn phí' : formatVND(o.shippingFee)}</td></tr>
              <tr className="totals-table__grand"><td>Tổng cộng</td><td>{formatVND(o.total)}</td></tr>
            </tbody>
          </table>
          {isPickup && (
            <p className="small muted pickup-note">
              Nhận tại: {s?.address || 'tiệm Nini Cakes'} • Ngày {formatDate(o.deliveryDate)} ({o.timeSlot}). Nhớ tên đặt bánh khi đến nhé!
            </p>
          )}
        </Reveal>

        <div className="order-side">
          <Reveal as="div" from="right" className="card pad">
            <h4>Người nhận</h4>
            <div className="small">{o.recipientName}{o.recipientPhone ? ` • ${o.recipientPhone}` : ''}</div>
            {!isPickup && o.addressLine && (
              <div className="small muted recipient-addr">
                {o.addressLine}{o.ward ? `, ${o.ward}` : ''}{o.district ? `, ${o.district}` : ''}
              </div>
            )}
            {!isPickup && (o.mapsUrl || (o.lat !== null && o.lng !== null)) && (
              <a
                className="pin-chip"
                href={o.mapsUrl || mapsLink({ lat: o.lat as number, lng: o.lng as number })}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={12} /> Xem vị trí giao trên bản đồ
              </a>
            )}
            <div className="small muted recipient-meta">
              {DELIVERY_TYPE_LABEL[o.deliveryType]} • {formatDate(o.deliveryDate)} • {o.timeSlot}
            </div>
            {o.note && <div className="small muted recipient-meta">Ghi chú: {o.note}</div>}
          </Reveal>

          <Reveal as="div" from="right" delay={70} className="card pad">
            <h4>Thanh toán</h4>
            <div className="small">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</div>
            <div className="pay-status">
              <StatusPill color={o.paymentStatus === 'PAID' ? '#55805A' : o.paymentStatus === 'REFUNDED' ? '#6D88A6' : '#BF8A3C'}>
                {PAYMENT_STATUS_LABEL[o.paymentStatus]}
              </StatusPill>
            </div>
            {o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED' && (
              <>
                <p className="small muted pay-guide">
                  Đơn đang chờ {formatVND(o.total)} — nội dung chuyển khoản <b>{o.code}</b>.
                </p>
                <Link to={`/thanh-toan/${o.id}`} className="btn btn-gold btn-sm pay-guide__cta">
                  <CreditCard size={14} /> Thanh toán ngay
                </Link>
              </>
            )}
          </Reveal>

          <Reveal as="div" from="right" delay={140} className="card pad">
            <h4>Lịch sử trạng thái</h4>
            <ul className="timeline">
              {[...o.history].reverse().map((h) => (
                <li key={h.id}>
                  <b className="small">{ORDER_STATUS_LABEL[h.toStatus as keyof typeof ORDER_STATUS_LABEL] || h.toStatus}</b>
                  <div className="small muted">{formatDateTime(h.createdAt)}{h.changedBy ? ` • ${h.changedBy.fullName}` : ''}{h.note ? ` — ${h.note}` : ''}</div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelM.mutate()}
        title={`Hủy đơn #${o.code}?`}
        message="Đơn sẽ được lấy ra khỏi bếp và không thể khôi phục. Nếu đã chuyển khoản, tiệm sẽ hoàn tiền sau khi kiểm tra."
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn lại"
        danger
        pending={cancelM.isPending}
      />

      {/* Hóa đơn in */}
      <InvoicePrint order={o} settings={s} />
    </div>
  );
}

function InvoicePrint({ order, settings }: { order: OrderDTO; settings: StoreSettingsDTO | undefined }) {
  return (
    <div className="print-area">
      <h2 style={{ fontFamily: 'var(--font-head)' }}>Nini Cakes — Hóa đơn #{order.code}</h2>
      {settings && (
        <p className="small">
          {settings.address} • {settings.phone} • {settings.email}<br />
          Ngày in: {new Date().toLocaleString('vi-VN')}
        </p>
      )}
      <table className="table" style={{ fontSize: 12 }}>
        <tbody>
          <tr><td>Người nhận</td><td>{order.recipientName}{order.recipientPhone ? ` — ${order.recipientPhone}` : ''}</td></tr>
          {order.deliveryType === 'DELIVERY' && <tr><td>Địa chỉ</td><td>{order.addressLine}{order.ward ? `, ${order.ward}` : ''}</td></tr>}
          <tr><td>Hình thức</td><td>{DELIVERY_TYPE_LABEL[order.deliveryType]} • {formatDate(order.deliveryDate)} • {order.timeSlot}</td></tr>
        </tbody>
      </table>
      <table className="table" style={{ fontSize: 12 }}>
        <thead>
          <tr><th>Bánh</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id}>
              <td>{it.name}{it.variantName ? ` (${it.variantName})` : ''}</td>
              <td>{it.quantity}</td>
              <td>{formatVND(it.unitPrice)}</td>
              <td>{formatVND(it.lineTotal)}</td>
            </tr>
          ))}
          <tr><td colSpan={3}>Thành tiền</td><td>{formatVND(order.subtotal)}</td></tr>
          {order.discount > 0 && <><tr><td colSpan={3}>Giảm giá {order.couponCode ? `(${order.couponCode})` : ''}</td><td>− {formatVND(order.discount)}</td></tr></>}
          <tr><td colSpan={3}>Phí giao</td><td>{order.shippingFee === 0 ? 'Miễn phí' : formatVND(order.shippingFee)}</td></tr>
          <tr><td colSpan={3}><b>Tổng cộng</b></td><td><b>{formatVND(order.total)}</b></td></tr>
        </tbody>
      </table>
      <p className="small">Cảm ơn quý khách đã tin dùng bánh của Nini Cakes!</p>
    </div>
  );
}
