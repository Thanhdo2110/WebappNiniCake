/** Thanh toán: địa chỉ (giao / nhận tại tiệm), ngày+khung giờ, thanh toán, mã giảm giá */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, MapPin, Store, Ticket } from 'lucide-react';
import type { AddressDTO, OrderDTO, StoreSettingsDTO } from '@shared/types';
import { DELIVERY_TIME_SLOTS } from '@shared';
import { formatVND, toISODate, addDays } from '../lib/format';
import { get, post, errMessage } from '../lib/api';
import { EmptyState, LoadingBlock, PageIntro, Reveal } from '../components/ui';
import { GeoPicker } from '../components/GeoPicker';
import { useCart } from '../hooks/cart';
import { useToast } from '../hooks/toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const cartQ = useCart();
  const addressesQ = useQuery({ queryKey: ['addresses'], queryFn: () => get<AddressDTO[]>('/addresses') });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => get<StoreSettingsDTO>('/settings') });

  const items = cartQ.data?.items || [];
  const subtotal = cartQ.data?.subtotal ?? 0;

  /* Form state */
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const addresses = useMemo<Array<AddressDTO>>(() => addressesQ.data || [], [addressesQ.data]);
  const [addressId, setAddressId] = useState<number | 'first' | 'new'>('first');
  const [manual, setManual] = useState({
    fullName: '', phone: '', addressLine: '', ward: '', district: '', city: '',
    lat: null as number | null, lng: null as number | null, mapsUrl: null as string | null,
  });
  const [deliveryDate, setDeliveryDate] = useState(() => toISODate(addDays(1)));
  const [timeSlot, setTimeSlot] = useState<string>(DELIVERY_TIME_SLOTS[2]);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [note, setNote] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  const settings = settingsQ.data;
  const shippingFee = useMemo(() => {
    if (!settings) return 0;
    if (deliveryType === 'PICKUP') return 0;
    if (settings.freeShippingMinVnd > 0 && subtotal >= settings.freeShippingMinVnd) return 0;
    return settings.shippingFeeVnd;
  }, [settings, deliveryType, subtotal]);

  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;

  const chosenAddress = useMemo<AddressDTO | null>(() => {
    if (addressId === 'new') return null;
    if (addressId === 'first') return addresses.find((a) => a.isDefault) || addresses[0] || null;
    return addresses.find((a) => a.id === addressId) || null;
  }, [addresses, addressId]);

  /* Ghép payload người nhận */
  const recipientData = () => {
    if (deliveryType === 'PICKUP') return {};
    if (chosenAddress) return { addressId: chosenAddress.id };
    return { address: manual };
  };

  const validateCoupon = useMutation({
    mutationFn: (code: string) => post<{ code: string; discount: number }>('/coupons/validate', { code, subtotal }),
    onSuccess: (r) => {
      setAppliedCoupon({ code: r.data.code, discount: r.data.discount });
      toast(`Áp dụng mã ${r.data.code}: giảm ${formatVND(r.data.discount)}`, 'ok');
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      post<OrderDTO>('/orders', {
        deliveryType,
        deliveryDate,
        timeSlot,
        paymentMethod,
        note: note || undefined,
        couponCode: appliedCoupon?.code || undefined,
        ...recipientData(),
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast(r.message || 'Đặt bánh thành công!', 'ok');
      navigate(`/tai-khoan/don-hang/${r.data.id}?welcome=1`);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  if (cartQ.isLoading) return <LoadingBlock text="Đang cân lại giỏ bánh..." />;

  if (items.length === 0) {
    return (
      <div className="container section">
        <EmptyState icon="🧺" title="Giỏ trống — chưa thể thanh toán">
          <Link to="/banh" className="btn btn-primary">Chọn bánh trước nhé</Link>
        </EmptyState>
      </div>
    );
  }

  const canSubmit: boolean = deliveryType === 'PICKUP'
    ? true
    : !!(chosenAddress || (manual.fullName.trim() && manual.phone.trim() && manual.addressLine.trim() && manual.city.trim()));

  const timeStep = deliveryType === 'PICKUP' ? 2 : 3;

  return (
    <>
      <PageIntro
        eyebrow="Chốt đơn"
        title="Thanh toán"
        subtitle="Bốn bước ngắn — bếp sẽ nhận đơn và gọi xác nhận cho bạn."
        crumbs={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]}
      />

      <div className="container section section--tight">
        <div className="checkout-grid">
          <div className="checkout-steps">
            <Reveal as="div" className="card pad step-card">
              <h3><span className="step-card__num">1</span>Cách nhận bánh</h3>
              <div className="pill-row">
                <button
                  type="button"
                  className={`pill-select pill-select--wide${deliveryType === 'DELIVERY' ? ' is-selected' : ''}`}
                  onClick={() => setDeliveryType('DELIVERY')}
                >
                  <MapPin size={16} /> <span className="pill-select__name">Giao tận nơi</span>
                </button>
                <button
                  type="button"
                  className={`pill-select pill-select--wide${deliveryType === 'PICKUP' ? ' is-selected' : ''}`}
                  onClick={() => setDeliveryType('PICKUP')}
                >
                  <Store size={16} /> <span className="pill-select__name">Nhận tại tiệm</span>
                </button>
              </div>
              {deliveryType === 'PICKUP' && settings && (
                <p className="small muted step-card__note">
                  Đến {settings.address} trong khung giờ bạn chọn. Nhân viên sẽ kiểm tra theo tên &amp; số điện thoại của bạn.
                </p>
              )}
            </Reveal>

            {deliveryType === 'DELIVERY' && (
              <Reveal as="div" className="card pad step-card">
                <h3><span className="step-card__num">2</span>Giao đến đâu?</h3>
                {addresses.length > 0 && (
                  <div className="addr-list">
                    {addresses.map((a) => (
                      <label key={a.id} className={`addr-card${addressId === a.id ? ' is-selected' : ''}`}>
                        <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span>
                          <b className="small">{a.fullName} • {a.phone}</b>
                          <span className="small muted addr-card__line">
                            {a.addressLine}{a.ward && `, ${a.ward}`}{a.district && `, ${a.district}`}, {a.city}
                          </span>
                          {a.lat !== null && a.lng !== null && (
                            <span className="addr-card__pin"><MapPin size={11} /> Đã ghim vị trí chính xác</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <label className={`addr-card addr-card--new${addressId === 'new' ? ' is-selected' : ''}`}>
                  <input type="radio" name="address" checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                  <span className="small">Nhập địa chỉ khác</span>
                </label>

                {(!addresses.length || addressId === 'new') && (
                  <div className="field-grid">
                    <div className="field"><label>Tên người nhận</label>
                      <input className="input" value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} maxLength={80} /></div>
                    <div className="field"><label>Số điện thoại</label>
                      <input className="input" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} placeholder="090..." maxLength={11} /></div>
                    <div className="field field-grid__full"><label>Địa chỉ (số nhà, tên đường)</label>
                      <input className="input" value={manual.addressLine} onChange={(e) => setManual({ ...manual, addressLine: e.target.value })} maxLength={200} /></div>
                    <div className="field"><label>Phường / xã</label>
                      <input className="input" value={manual.ward} onChange={(e) => setManual({ ...manual, ward: e.target.value })} maxLength={60} /></div>
                    <div className="field"><label>Quận / huyện</label>
                      <input className="input" value={manual.district} onChange={(e) => setManual({ ...manual, district: e.target.value })} maxLength={60} /></div>
                    <div className="field"><label>Tỉnh / thành</label>
                      <input className="input" value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} maxLength={60} /></div>
                    <div className="field field-grid__full">
                      <GeoPicker
                        value={{ lat: manual.lat, lng: manual.lng, mapsUrl: manual.mapsUrl }}
                        onChange={(g) => setManual({ ...manual, lat: g.lat ?? null, lng: g.lng ?? null, mapsUrl: g.mapsUrl ?? null })}
                      />
                    </div>
                  </div>
                )}
              </Reveal>
            )}

            <Reveal as="div" className="card pad step-card">
              <h3><span className="step-card__num">{timeStep}</span>Ngày &amp; khung giờ nhận</h3>
              <div className="field-grid">
                <div className="field">
                  <label>Ngày</label>
                  <input type="date" className="input" value={deliveryDate} min={toISODate(addDays(0))} max={toISODate(addDays(45))} onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Khung giờ</label>
                  <select className="select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                    {DELIVERY_TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field field-grid__full" style={{ marginBottom: 0 }}>
                  <label>Ghi chú riêng cho tiệm</label>
                  <textarea className="textarea" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="VD: gọi điện trước khi giao 15 phút" />
                </div>
              </div>
            </Reveal>

            <Reveal as="div" className="card pad step-card">
              <h3><span className="step-card__num">{timeStep + 1}</span>Cách thanh toán</h3>
              <div className="pay-list">
                <button
                  type="button"
                  className={`pay-opt${paymentMethod === 'BANK_TRANSFER' ? ' is-selected' : ''}`}
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                >
                  <span className="pay-opt__icon"><CreditCard size={17} /></span>
                  <span className="pay-opt__body">
                    <b>Chuyển khoản / QR</b>
                    <span className="small muted">Tiệm xác nhận tiền rồi bắt tay vào bếp.</span>
                  </span>
                  <span className="pay-opt__tick" aria-hidden />
                </button>
                {paymentMethod === 'BANK_TRANSFER' && settings && (
                  <div className="pay-detail small muted">
                    Chuyển <b>{formatVND(total)}</b> vào <b>{settings.bankName}</b>, STK <b>{settings.bankAccountNumber}</b> ({settings.bankAccountName}),
                    nội dung: tên người nhận.
                  </div>
                )}
                <button
                  type="button"
                  className={`pay-opt${paymentMethod === 'COD' ? ' is-selected' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <span className="pay-opt__icon"><Banknote size={17} /></span>
                  <span className="pay-opt__body">
                    <b>Trả tiền mặt khi nhận (COD)</b>
                    <span className="small muted">Chuẩn bị đủ tiền mặt cho nhân viên giao bánh.</span>
                  </span>
                  <span className="pay-opt__tick" aria-hidden />
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal as="aside" from="right" className="card pad summary-card">
            <span className="eyebrow no-rule">Tóm tắt đơn</span>
            <ul className="summary-list">
              {items.map((it) => (
                <li key={it.id}>
                  <span className="small">
                    {it.quantity}× {it.productName.length > 24 ? it.productName.slice(0, 24) + '…' : it.productName}
                    <span className="muted summary-list__variant">{it.variantName}</span>
                  </span>
                  <b className="small">{formatVND(it.lineTotal)}</b>
                </li>
              ))}
            </ul>

            <div className="field">
              <label>Mã giảm giá</label>
              <div className="coupon-row">
                <span className="coupon-row__icon"><Ticket size={15} /></span>
                <input className="input" placeholder="VD: WELCOME10" value={couponInput} maxLength={30}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                <button className="btn btn-soft btn-sm" type="button" disabled={!couponInput.trim() || validateCoupon.isPending}
                  onClick={() => validateCoupon.mutate(couponInput.trim())}>Áp dụng</button>
              </div>
              {appliedCoupon && (
                <div className="coupon-on small form-success">
                  <span>Đang dùng mã {appliedCoupon.code} · giảm {formatVND(appliedCoupon.discount)}</span>
                  <button type="button" className="link-del" onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}>bỏ</button>
                </div>
              )}
              <span className="small muted">Có thể dùng thử WELCOME10, NINI150K hoặc SAKURA25 (tùy điều kiện từng mã).</span>
            </div>

            <table className="table summary-table">
              <tbody>
                <tr><td>Tạm tính</td><td>{formatVND(subtotal)}</td></tr>
                <tr><td>Giảm giá</td><td className="is-ok">− {formatVND(discount)}</td></tr>
                <tr><td>Phí giao / nhận</td><td>{shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</td></tr>
                <tr className="summary-table__total"><td>Tổng cộng</td><td>{formatVND(total)}</td></tr>
              </tbody>
            </table>

            <button type="button" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }}
              onClick={() => placeOrder.mutate()}
              disabled={!canSubmit || placeOrder.isPending}>
              {placeOrder.isPending ? 'Đang gửi cho bếp...' : 'Chốt đơn, vào bếp!'}
            </button>
            {!canSubmit && <p className="small form-error" style={{ marginTop: 8 }}>Nhập đủ người nhận &amp; địa chỉ đơn giao nhé!</p>}
            <p className="small faint summary-card__note">
              Nini gọi điện xác nhận đơn trong ít phút sau khi chốt; nếu cần chỉnh đổi sớm, hãy nhắn tiệm qua số hotline.
            </p>
          </Reveal>
        </div>
      </div>
    </>
  );
}
