/** Xử lý đơn: chuyển trạng thái đúng luồng, set thanh toán, hủy, in hóa đơn */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import type { OrderDTO, StoreSettingsDTO } from '@shared/types';
import {
  ORDER_STATUS_LABEL, DELIVERY_TYPE_LABEL, PAYMENT_METHOD_LABEL,
  canTransition,
} from '@shared';
import { formatVND, formatDateTime, formatDate } from '../lib/format';
import { imageUrl } from '../lib/placeholder';
import { get, patch, post, errMessage } from '../lib/api';
import { Loading, PageTitle, ZoomImage, PaymentPill } from '../components/ui';
import { StatusTag } from '../components/bits';
import { useToast } from '../hooks/toast';
import { BadgeCheck, Ban, ChefHat, Clock, Flag, PackageCheck, Truck } from 'lucide-react';

/** Luồng hiển thị: đơn nhận tại tiệm không có bước "Đang giao" */
const FLOW_DELIVERY = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED'] as const;
const FLOW_PICKUP = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] as const;

const STATUS_ICON = {
  PENDING: Clock, CONFIRMED: BadgeCheck, PREPARING: ChefHat,
  READY: PackageCheck, SHIPPED: Truck, COMPLETED: Flag, CANCELLED: Ban,
} as const;

const ACTION_TEXT: Partial<Record<string, string>> = {
  CONFIRMED: 'Xác nhận đơn',
  PREPARING: 'Đưa vào bếp',
  READY: 'Bánh đã xong',
  SHIPPED: 'Bắt đầu giao',
};

/** Ưu tiên toạ độ đã ghim; đơn cũ suy ra từ địa chỉ chữ */
function orderMapsHref(o: OrderDTO): string {
  if (o.lat !== null && o.lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${o.lat.toFixed(6)},${o.lng.toFixed(6)}`;
  }
  // city vẫn lưu trong DB nhưng không in: tiệm chỉ giao nội thành, khách không nhập dòng này
  const text = [o.addressLine, o.ward, o.district].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');

  const q = useQuery({ queryKey: ['admin-order', id], queryFn: () => get<OrderDTO>(`/admin/orders/${id}`) });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => get<StoreSettingsDTO>('/settings') });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-order', id] });
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const statusM = useMutation({
    mutationFn: (to: OrderDTO['status']) => patch(`/admin/orders/${id}/status`, { status: to, note: note || undefined }),
    onSuccess: (r) => { toast(r.message || 'Đã cập nhật trạng thái.', 'ok'); refreshAll(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const payM = useMutation({
    mutationFn: (ps: 'UNPAID' | 'PAID' | 'REFUNDED') => patch(`/admin/orders/${id}/payment`, { paymentStatus: ps, reference: reference || undefined }),
    onSuccess: (r) => { toast(r.message || 'Đã cập nhật thanh toán.', 'ok'); refreshAll(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const cancelM = useMutation({
    mutationFn: () => post(`/admin/orders/${id}/cancel`, { reason: note || 'Theo yêu cầu cửa hàng' }),
    onSuccess: (r) => { toast(r.message || 'Đã hủy đơn.', 'ok'); refreshAll(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  if (q.isLoading) return <Loading text="Đang mở đơn..." />;
  if (q.isError || !q.data) {
    return <div className="error-box">Không tìm thấy đơn #… <Link to="/orders">Về danh sách</Link></div>;
  }

  const o = q.data;
  const s = settingsQ.data;
  const candidates: OrderDTO['status'][] = ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
  const isPickup = o.deliveryType === 'PICKUP';
  const flow: OrderDTO['status'][] = [...(isPickup ? FLOW_PICKUP : FLOW_DELIVERY)];
  const stepIndex = flow.indexOf(o.status);
  const nexts = candidates
    .filter((c) => canTransition(o.status, c))
    .filter((c) => !(isPickup && c === 'SHIPPED'));
  const advance = nexts.filter((c) => c !== 'CANCELLED');
  const canCancel = nexts.includes('CANCELLED');
  const actionText = (st: OrderDTO['status']) =>
    st === 'COMPLETED' ? (isPickup ? 'Khách đã nhận bánh' : 'Hoàn thành đơn') : (ACTION_TEXT[st] ?? ORDER_STATUS_LABEL[st]);

  return (
    <div style={{ maxWidth: 1050 }}>
      <PageTitle
        title={`Đơn #${o.code}`}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusTag status={o.status} />
            {o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'UNPAID' && s && (
              <span className="small muted">{s?.bankAccountName} • {s?.bankAccountNumber}</span>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ In đơn giao bếp</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Hành động trạng thái */}
          <div className="card pad status-card">
            <div className="status-card__head">
              <h3 style={{ fontSize: 17, margin: 0 }}>Trạng thái đơn hàng</h3>
              <StatusTag status={o.status} />
            </div>
            <div className="small muted">
              Đặt lúc {formatDateTime(o.createdAt)} • {DELIVERY_TYPE_LABEL[o.deliveryType]} • nhận {formatDate(o.deliveryDate)} ({o.timeSlot})
            </div>

            {o.status === 'CANCELLED' ? (
              <div className="error-box status-cancelled">
                Đơn đã hủy{o.cancelReason ? ` — ${o.cancelReason}` : ''}. Không còn bước chuyển nào.
              </div>
            ) : (
              <ol className="stepper">
                {flow.map((st, i) => {
                  const Icon = STATUS_ICON[st];
                  const cls = i < stepIndex ? ' is-done' : i === stepIndex ? ' is-current' : '';
                  return (
                    <li key={st} className={`stepper__step${cls}`}>
                      <span className="stepper__dot"><Icon size={19} /></span>
                      <span className="stepper__label">{ORDER_STATUS_LABEL[st]}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {advance.length > 0 && (
              <div className="status-actions">
                {advance.map((n, idx) => {
                  const Icon = STATUS_ICON[n];
                  return (
                    <button key={n} type="button" className={`btn btn-lg ${idx === 0 ? 'btn-primary' : 'btn-gold'}`}
                      disabled={statusM.isPending} onClick={() => statusM.mutate(n)}>
                      <Icon size={18} /> {actionText(n)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="field" style={{ margin: '14px 0 0' }}>
              <label>Ghi chú cho bước chuyển (lưu vào lịch sử đơn)</label>
              <input className="input" value={note} maxLength={300} placeholder="VD: khách đổi giờ, còn thiếu thành toán..."
                onChange={(e) => setNote(e.target.value)} />
            </div>
            {canCancel && (
              <button className="btn btn-danger" style={{ marginTop: 12 }} onClick={() => cancelM.mutate()} disabled={cancelM.isPending}>
                <Ban size={16} /> Hủy đơn hàng
              </button>
            )}
          </div>

          {/* Bánh trong đơn */}
          <div className="card pad">
            <h3 className="o-title">Danh sách bánh</h3>
            <table className="table o-table">
              <thead><tr><th>Bánh</th><th>SL</th><th>Đơn giá</th><th className="right">Thành tiền</th></tr></thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="o-item">
                        <ZoomImage src={imageUrl(it.imageUrl, it.name)} alt={it.name} caption={`${it.name} — ${it.variantName || 'mặc định'}`} className="o-thumb" />
                        <div className="o-info">
                          <b className="o-name">{it.name}</b>
                          {it.variantName && <div className="o-variant">{it.variantName}</div>}
                          {it.options?.messageOnCake !== undefined && (
                            <div className="o-msg"><span>Lời chúc trên bánh</span>“{String(it.options.messageOnCake)}”</div>
                          )}
                          {typeof it.options?.notes === 'string' && it.options.notes && (
                            <div className="o-note"><span>Ghi chú chế biến</span>{it.options.notes}</div>
                          )}
                          {typeof it.options?.referenceImageUrl === 'string' && it.options.referenceImageUrl && (
                            <ZoomImage src={it.options.referenceImageUrl} alt="Ảnh tham khảo khách gửi" caption="Ảnh tham khảo khách gửi" className="o-ref" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td><b className="o-qty">{it.quantity}</b></td>
                    <td>{formatVND(it.unitPrice)}</td>
                    <td className="right" style={{ fontWeight: 700 }}>{formatVND(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="table" style={{ marginTop: 8, maxWidth: 320, marginLeft: 'auto' }}>
              <tbody>
                <tr><td>Thành tiền</td><td className="right">{formatVND(o.subtotal)}</td></tr>
                {o.discount > 0 && <tr><td>Giảm {o.couponCode && `(${o.couponCode})`}</td><td className="right" style={{ color: 'var(--ok)' }}>− {formatVND(o.discount)}</td></tr>}
                <tr><td>Phí giao</td><td className="right">{o.shippingFee === 0 ? 'Miễn phí' : formatVND(o.shippingFee)}</td></tr>
                <tr><td><b>Tổng</b></td><td className="right" style={{ fontWeight: 800 }}>{formatVND(o.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Lịch sử */}
          <div className="card pad">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Lịch sử xử lý</h3>
            {o.history.length === 0 && <p className="small muted">Chưa có chuyển động nào.</p>}
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {o.history.slice().reverse().map((h) => (
                <li key={h.id} className="small" style={{ padding: '8px 0', borderBottom: '1px dashed var(--line-2)' }}>
                  <b>{h.fromStatus ? `${ORDER_STATUS_LABEL[h.fromStatus as keyof typeof ORDER_STATUS_LABEL]} → ` : ''}{ORDER_STATUS_LABEL[h.toStatus as keyof typeof ORDER_STATUS_LABEL]}</b>
                  {' — '}{formatDateTime(h.createdAt)}
                  {h.changedBy && ` • ${h.changedBy.fullName}`}
                  {h.note && <div className="small muted">📝 {h.note}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Cột phải: người nhận + thanh toán + tổng */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card pad">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Giao / nhận</h3>
            <div className="small muted mb-8">{DELIVERY_TYPE_LABEL[o.deliveryType]} • {formatDate(o.deliveryDate)} • {o.timeSlot}</div>
            <b className="small">{o.recipientName}</b> <span className="small muted">{o.recipientPhone}</span>
            {o.deliveryType === 'DELIVERY' && o.addressLine && (
              <div className="small muted" style={{ marginTop: 4 }}>
                {o.addressLine}{o.ward ? `, ${o.ward}` : ''}{o.district ? `, ${o.district}` : ''}
              </div>
            )}
            {o.deliveryType === 'DELIVERY' && o.addressLine && (
              <div className="map-links">
                <a className="map-links__btn" href={orderMapsHref(o)} target="_blank" rel="noreferrer">📍 Mở Google Maps</a>
                {o.lat !== null && o.lng !== null && (
                  <a className="map-links__btn" href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`} target="_blank" rel="noreferrer">
                    🧭 Chỉ đường tới khách
                  </a>
                )}
                {o.lat !== null && o.lng !== null && (
                  <span className="small muted">đã ghim: {o.lat.toFixed(6)}, {o.lng.toFixed(6)}</span>
                )}
              </div>
            )}
            {o.note && <div className="small" style={{ marginTop: 8, background: 'var(--cream-2)', padding: 8, borderRadius: 8 }}>💬 {o.note}</div>}
            {o.user && (
              <div className="small muted" style={{ marginTop: 12 }}>
                Tài khoản: <Link to={`/customers/${o.user.id}`} style={{ color: 'var(--champagne)' }}>{o.user.fullName}</Link>
                <div>{[o.user.email, o.user.phone].filter(Boolean).join(' • ')}</div>
              </div>
            )}
          </div>

          <div className="card pad">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Thanh toán</h3>
            <div className="small mb-8">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</div>
            <div className="flex gap-8 mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <PaymentPill status={o.paymentStatus} />
              {o.paymentStatus !== 'PAID' && o.paymentMethod !== 'COD' && (
                <button className="btn btn-primary btn-sm" onClick={() => payM.mutate('PAID')} disabled={payM.isPending}>Xác nhận đã nhận tiền</button>
              )}
              {o.paymentStatus === 'PAID' && o.paymentMethod !== 'COD' && (
                <button className="btn btn-outline btn-sm" onClick={() => payM.mutate('REFUNDED')} disabled={payM.isPending}>Ghi nhận hoàn tiền</button>
              )}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Mã hóa đơn CK (nếu có)</label>
              <input className="input" value={reference} maxLength={100} placeholder="VD: FT2511..." onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          <div className="card pad" style={{ background: '#fffaf0' }}>
            <h3 style={{ fontSize: 15 }}>Tình hình tiền</h3>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span>Tổng tiền</span><b style={{ fontSize: 18 }}>{formatVND(o.total)}</b>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              {o.paymentStatus === 'PAID' ? 'Khách đã trả đủ — sẵn sàng vào bếp!' : o.paymentMethod === 'COD' ? 'Thu tiền khi giao — nhớ đem bill.' : 'Chờ chuyển khoản của khách.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
