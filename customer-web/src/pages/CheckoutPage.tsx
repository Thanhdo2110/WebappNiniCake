/** Thanh toán: địa chỉ (giao / nhận tại tiệm) với kiểm tra tại chỗ, ngày+khung giờ,
    thanh toán, mã giảm giá, tóm tắt dính + CTA mobile. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Banknote, CreditCard, Lock, MapPin, Phone, ShieldCheck, Store, Ticket } from 'lucide-react';
import type { AddressDTO, OrderDTO, StoreSettingsDTO } from '@shared/types';
import { DELIVERY_TIME_SLOTS, firstSelectableSlot, isSlotSelectable, vnTodayISO } from '@shared';
import { formatVND, toISODate, addDays } from '../lib/format';
import { get, post, errMessage } from '../lib/api';
import { EmptyState, LoadingBlock, PageIntro, Reveal } from '../components/ui';
import { GeoPicker } from '../components/GeoPicker';
import { useCart } from '../hooks/cart';
import { useToast } from '../hooks/toast';
import { useSeo } from '../lib/seo';
import { ADDRESS_FIELD_ORDER, addressFormSchema, focusFirstError } from '../lib/validation';
import type { AddressForm } from '../lib/validation';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  useSeo({ title: 'Thanh toán', description: 'Xác nhận địa chỉ, khung giờ và cách thanh toán cho đơn bánh của bạn.' });

  const cartQ = useCart();
  const addressesQ = useQuery({ queryKey: ['addresses'], queryFn: () => get<AddressDTO[]>('/addresses') });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => get<StoreSettingsDTO>('/settings') });

  const items = cartQ.data?.items || [];
  const subtotal = cartQ.data?.subtotal ?? 0;

  /* Form state */
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const addresses = useMemo<Array<AddressDTO>>(() => addressesQ.data || [], [addressesQ.data]);
  /* Không tự chọn sẵn địa chỉ — khách phải chủ động bấm vào một cái (hoặc "Nhập địa chỉ khác") */
  const [addressId, setAddressId] = useState<number | 'new' | null>(null);
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null; mapsUrl: string | null }>({ lat: null, lng: null, mapsUrl: null });
  const [saveAddress, setSaveAddress] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState(() => toISODate(addDays(1)));
  const [timeSlot, setTimeSlot] = useState<string>(DELIVERY_TIME_SLOTS[2]);
  const todayVN = useMemo(() => vnTodayISO(), []);
  /* Chọn ngày hôm nay thì các khung đã trôi qua không còn dùng được → nhảy về khung kế tiếp */
  useEffect(() => {
    setTimeSlot((cur) => (isSlotSelectable(deliveryDate, cur) ? cur : firstSelectableSlot(DELIVERY_TIME_SLOTS, deliveryDate) ?? cur));
  }, [deliveryDate]);
  const slotOfToday = deliveryDate === todayVN;
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [note, setNote] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { fullName: '', phone: '', addressLine: '', ward: '', district: '', city: 'TP. Hồ Chí Minh' },
    mode: 'onBlur',
  });
  const { register, formState: { errors }, trigger } = form;

  const settings = settingsQ.data;
  const shippingFee = useMemo(() => {
    if (!settings) return 0;
    if (deliveryType === 'PICKUP') return 0;
    if (settings.freeShippingMinVnd > 0 && subtotal >= settings.freeShippingMinVnd) return 0;
    return settings.shippingFeeVnd;
  }, [settings, deliveryType, subtotal]);

  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;

  const chosenAddress = useMemo<AddressDTO | null>(
    () => (typeof addressId === 'number' ? addresses.find((a) => a.id === addressId) || null : null),
    [addresses, addressId]
  );

  const manualDraft = { name: form.watch('fullName'), phone: form.watch('phone'), line: form.watch('addressLine') };
  const manualFilled = Boolean(manualDraft.name?.trim() && manualDraft.phone?.trim() && manualDraft.line?.trim());
  const needsManualAddress = deliveryType === 'DELIVERY' && addressId === 'new';
  /** Giao tận nơi: chưa bấm chọn địa chỉ nào, hoặc chọn "nhập khác" mà chưa điền đủ → chưa cho chốt */
  const addressMissing = deliveryType === 'DELIVERY' && !chosenAddress && !(addressId === 'new' && manualFilled);

  /* Ghép payload người nhận */
  const recipientData = () => {
    if (deliveryType === 'PICKUP') return {};
    if (chosenAddress) return { addressId: chosenAddress.id };
    const v = form.getValues();
    return { address: { ...v, lat: geo.lat, lng: geo.lng, mapsUrl: geo.mapsUrl } };
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
    onSuccess: async (r) => {
      /* Tùy chọn: lưu địa chỉ vừa nhập vào sổ địa chỉ */
      if (needsManualAddress && saveAddress) {
        try {
          const v = form.getValues();
          await post('/addresses', { ...v, lat: geo.lat, lng: geo.lng, mapsUrl: geo.mapsUrl });
          qc.invalidateQueries({ queryKey: ['addresses'] });
        } catch {
          /* Không chặn luồng đặt hàng chỉ vì lỗi lưu địa chỉ */
        }
      }
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      /* Không báo "đặt thành công" ở bước này — chỉ báo khi tiền thực sự về */
      if (r.data.paymentMethod === 'BANK_TRANSFER') navigate(`/thanh-toan/${r.data.id}`);
      else navigate(`/tai-khoan/don-hang/${r.data.id}?welcome=1`);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  /** Bấm chốt đơn: kiểm tra tại chỗ, cuộn tới chỗ sai rồi mới gửi */
  const submitOrder = async () => {
    if (placeOrder.isPending) return;
    if (needsManualAddress) {
      const ok = await trigger();
      if (!ok) {
        focusFirstError(ADDRESS_FIELD_ORDER, form.formState.errors);
        toast('Vui lòng kiểm tra lại thông tin giao hàng.', 'err');
        return;
      }
    }
    placeOrder.mutate();
  };

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

  const timeStep = deliveryType === 'PICKUP' ? 2 : 3;
  const errOf = (k: keyof AddressForm) => errors[k]?.message;

  return (
    <>
      <PageIntro
        eyebrow="Chốt đơn"
        title="Thanh toán"
        subtitle="Bốn bước ngắn. Chọn chuyển khoản thì đơn vào bếp ngay khi tiền về — chưa tiền thì đơn còn chờ bạn."
        crumbs={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]}
      />

      <div className="container checkout-back">
        <Link to="/gio-hang" className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Quay lại giỏ hàng
        </Link>
      </div>

      <div className="container section section--tight">
        <div className="checkout-grid">
          <div className="checkout-steps">
            <Reveal as="div" className="card pad step-card">
              <h3><span className="step-card__num">1</span>Cách nhận bánh</h3>
              <div className="pill-row" role="group" aria-label="Cách nhận bánh">
                <button
                  type="button"
                  className={`pill-select pill-select--wide${deliveryType === 'DELIVERY' ? ' is-selected' : ''}`}
                  onClick={() => setDeliveryType('DELIVERY')}
                  aria-pressed={deliveryType === 'DELIVERY'}
                >
                  <MapPin size={16} /> <span className="pill-select__name">Giao tận nơi</span>
                </button>
                <button
                  type="button"
                  className={`pill-select pill-select--wide${deliveryType === 'PICKUP' ? ' is-selected' : ''}`}
                  onClick={() => setDeliveryType('PICKUP')}
                  aria-pressed={deliveryType === 'PICKUP'}
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
              <Reveal as="div" className="card pad step-card" id="step-address">
                <h3><span className="step-card__num">2</span>Giao đến đâu?</h3>
                <p className="small muted" style={{ margin: '-6px 0 14px' }}>
                  Chọn một địa chỉ đã lưu, hoặc bấm “Nhập địa chỉ khác” và điền đủ — chưa có địa chỉ thì chưa chốt đơn được.
                </p>
                {addressesQ.isError && (
                  <div className="notice-box small" style={{ marginBottom: 14 }}>
                    Chưa tải được sổ địa chỉ — bạn vẫn có thể nhập địa chỉ mới bên dưới.{' '}
                    <button type="button" className="link-gold" onClick={() => addressesQ.refetch()}>Thử tải lại</button>
                  </div>
                )}
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
                {addressId === null && (
                  <p className="small addr-need" role="status">
                    Chọn một địa chỉ ở trên (hoặc “Nhập địa chỉ khác”) thì mới chốt đơn được — tiệm cần biết giao đi đâu.
                  </p>
                )}

                {(!addresses.length || addressId === 'new') && (
                  <form className="field-grid" onSubmit={(e) => e.preventDefault()} noValidate>
                    <div className="field">
                      <label htmlFor="co-fullName">Tên người nhận</label>
                      <input id="co-fullName" className={`input${errOf('fullName') ? ' is-invalid' : ''}`} maxLength={80}
                        aria-invalid={!!errOf('fullName')} autoComplete="name"
                        {...register('fullName')} />
                      {errOf('fullName') && <span className="form-error">{errOf('fullName')}</span>}
                    </div>
                    <div className="field">
                      <label htmlFor="co-phone">Số điện thoại</label>
                      <input id="co-phone" className={`input${errOf('phone') ? ' is-invalid' : ''}`} placeholder="090..." maxLength={11}
                        inputMode="tel" autoComplete="tel" aria-invalid={!!errOf('phone')}
                        {...register('phone')} />
                      {errOf('phone') && <span className="form-error">{errOf('phone')}</span>}
                    </div>
                    <div className="field field-grid__full">
                      <label htmlFor="co-line">Địa chỉ (số nhà, tên đường)</label>
                      <input id="co-line" className={`input${errOf('addressLine') ? ' is-invalid' : ''}`} maxLength={200}
                        autoComplete="street-address" aria-invalid={!!errOf('addressLine')}
                        {...register('addressLine')} />
                      {errOf('addressLine') && <span className="form-error">{errOf('addressLine')}</span>}
                    </div>
                    {/* ward/district/city gửi ngầm theo mặc định ('TP. Hồ Chí Minh') — không cần người dùng gõ */}
                    <div className="field field-grid__full">
                      <GeoPicker
                        value={geo}
                        onChange={(g) => setGeo({ lat: g.lat ?? null, lng: g.lng ?? null, mapsUrl: g.mapsUrl ?? null })}
                      />
                    </div>
                    <label className="check-row field-grid__full" style={{ marginTop: -4 }}>
                      <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                      Lưu địa chỉ này vào sổ địa chỉ của tôi
                    </label>
                  </form>
                )}
              </Reveal>
            )}

            <Reveal as="div" className="card pad step-card">
              <h3><span className="step-card__num">{timeStep}</span>Ngày &amp; khung giờ nhận</h3>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="co-date">Ngày</label>
                  <input id="co-date" type="date" className="input" value={deliveryDate} min={todayVN} max={toISODate(addDays(45))} onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="co-slot">Khung giờ</label>
                  <select id="co-slot" className="select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                    {DELIVERY_TIME_SLOTS.map((t) => {
                      const gone = !isSlotSelectable(deliveryDate, t);
                      return (
                        <option key={t} value={t} disabled={gone}>
                          {gone ? `${t} · đã trôi qua` : t}
                        </option>
                      );
                    })}
                  </select>
                  {slotOfToday && (
                    <p className="small muted slot-note">
                      Nhận trong hôm nay: tiệm chỉ giao được các khung giờ còn lại tính từ bây giờ.
                    </p>
                  )}
                </div>
                <div className="field field-grid__full" style={{ marginBottom: 0 }}>
                  <label htmlFor="co-note">Ghi chú riêng cho tiệm</label>
                  <textarea id="co-note" className="textarea" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="VD: gọi điện trước khi giao 15 phút" />
                </div>
              </div>
            </Reveal>

            <Reveal as="div" className="card pad step-card">
              <h3><span className="step-card__num">{timeStep + 1}</span>Cách thanh toán</h3>
              <div className="pay-list" role="group" aria-label="Cách thanh toán">
                <button
                  type="button"
                  className={`pay-opt${paymentMethod === 'BANK_TRANSFER' ? ' is-selected' : ''}`}
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  aria-pressed={paymentMethod === 'BANK_TRANSFER'}
                >
                  <span className="pay-opt__icon"><CreditCard size={17} /></span>
                  <span className="pay-opt__body">
                    <b>Chuyển khoản / QR</b>
                    <span className="small muted">Tiệm xác nhận tiền rồi bắt tay vào bếp.</span>
                  </span>
                  <span className="pay-opt__tick" aria-hidden />
                </button>
                {paymentMethod === 'BANK_TRANSFER' && settings && !settings.payosEnabled && (
                  <div className="pay-detail small muted" role="note">
                    Đặt xong, trang đơn hàng sẽ hiện số tài khoản và nội dung chuyển khoản riêng cho đơn của bạn.
                  </div>
                )}
                <button
                  type="button"
                  className={`pay-opt${paymentMethod === 'COD' ? ' is-selected' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                  aria-pressed={paymentMethod === 'COD'}
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
              <label htmlFor="co-coupon">Mã giảm giá</label>
              <div className="coupon-row">
                <span className="coupon-row__icon"><Ticket size={15} /></span>
                <input id="co-coupon" className="input" placeholder="VD: WELCOME10" value={couponInput} maxLength={30}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                <button className="btn btn-soft btn-sm" type="button" disabled={!couponInput.trim() || validateCoupon.isPending}
                  onClick={() => validateCoupon.mutate(couponInput.trim())}>
                  {validateCoupon.isPending ? 'Đang kiểm tra…' : 'Áp dụng'}
                </button>
              </div>
              {appliedCoupon && (
                <div className="coupon-on small form-success" role="status">
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
              onClick={() => void submitOrder()}
              disabled={placeOrder.isPending || addressMissing}
              title={addressMissing ? 'Cần chọn hoặc nhập địa chỉ giao hàng' : undefined}>
              {placeOrder.isPending ? 'Đang gửi cho bếp...' : 'Chốt đơn, vào bếp!'}
            </button>
            {addressMissing && (
              <p className="small muted" style={{ marginTop: 8 }}>
                Quay lại bước 2 chọn địa chỉ, hoặc nhập địa chỉ mới — thiếu địa chỉ thì tiệm không giao được.
              </p>
            )}
            {needsManualAddress && Object.keys(errors).length > 0 && (
              <p className="small form-error" style={{ marginTop: 8 }} role="alert">
                Còn thông tin giao hàng chưa đúng — xem lại bước 2 bạn nhé!
              </p>
            )}

            <div className="trust-row">
              {settings?.phone && (
                <a href={`tel:${settings.phone}`} className="trust-row__item">
                  <Phone size={13} /> Hotline {settings.phone}
                </a>
              )}
              <Link to="/chinh-sach" className="trust-row__item">
                <ShieldCheck size={13} /> Chính sách hoãn / hủy
              </Link>
              <span className="trust-row__item">
                <Lock size={13} /> Thông tin được bảo mật
              </span>
            </div>

            <p className="small faint summary-card__note">
              Nini gọi điện xác nhận đơn trong ít phút sau khi chốt; nếu cần chỉnh đổi sớm, hãy nhắn tiệm qua số hotline.
            </p>
          </Reveal>
        </div>
      </div>

      {/* CTA dính đáy cho màn hình nhỏ */}
      <div className="mobile-buy-bar is-show">
        <div className="mobile-buy-bar__info">
          <span className="mobile-buy-bar__name">Tổng cộng • {deliveryType === 'PICKUP' ? 'nhận tại tiệm' : 'giao tận nơi'}</span>
          <b className="mobile-buy-bar__price">{formatVND(total)}</b>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void submitOrder()} disabled={placeOrder.isPending || addressMissing}>
          {placeOrder.isPending ? 'Đang gửi…' : addressMissing ? 'Cần địa chỉ giao hàng' : 'Chốt đơn'}
        </button>
      </div>
    </>
  );
}
