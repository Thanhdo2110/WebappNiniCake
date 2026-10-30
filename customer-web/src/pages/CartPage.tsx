/** Giỏ hàng: cộng/trừ/xóa dòng, hiện lời chúc & ghi chú, tiến trình freeship,
    gợi ý mua kèm, thanh CTA dính đáy trên mobile. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react';
import type { OrderDTO, Paginated, ProductListDTO } from '@shared/types';
import { MAX_CART_QUANTITY, isAwaitingPayment } from '@shared';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../hooks/cart';
import { useAuth } from '../hooks/auth';
import { useSettings } from '../hooks/catalog';
import { useToast } from '../hooks/toast';
import { EmptyState, LoadingBlock, PageIntro, Reveal, Stagger } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { ConfirmDialog } from '../components/Overlay';
import { ShipProgress } from '../components/ShipProgress';
import { formatVND } from '../lib/format';
import { imageUrl, imgFallback } from '../lib/placeholder';
import { errMessage, get } from '../lib/api';
import { useSeo } from '../lib/seo';

export default function CartPage() {
  const { data: cart, isLoading, isError, error, refetch } = useCart();
  const { data: settings } = useSettings();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const clear = useClearCart();
  const { logged } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);

  useSeo({ title: 'Giỏ hàng', description: 'Kiểm tra lại giỏ bánh của bạn trước khi thanh toán.' });

  /* Đơn chuyển khoản còn chờ tiền — để khách quay lại trả tiếp ngay từ giỏ */
  const awaitingQ = useQuery({
    queryKey: ['orders', 'awaiting'],
    queryFn: () => get<Paginated<OrderDTO>>('/orders', { perPage: 5 }),
    enabled: logged,
  });
  const awaiting = (awaitingQ.data?.items || []).filter(isAwaitingPayment);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;

  /* Chọn một phần giỏ để đặt. Lưu tập "bỏ chọn" thay vì "chọn", để món thêm sau
     mặc nhiên vẫn được chọn. Tập rỗng = mua tất cả → không gửi itemIds, hành vi
     y hệt như trước. */
  const [unpicked, setUnpicked] = useState<Set<number>>(new Set());
  const selected = items.filter((it) => !unpicked.has(it.id));
  const allSelected = selected.length === items.length;
  const selectedSubtotal = selected.reduce((sum, it) => sum + it.lineTotal, 0);
  const togglePick = (id: number) =>
    setUnpicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const goCheckout = () =>
    navigate(allSelected ? '/thanh-toan' : `/thanh-toan?items=${selected.map((it) => it.id).join(',')}`);

  const eligibleCheckout = logged;

  /* Gợi ý mua kèm: bánh bán chạy, loại trừ những gì đã trong giỏ */
  const crossQ = useQuery({
    queryKey: ['cart-cross-sell'],
    queryFn: () => get<Paginated<ProductListDTO>>('/products', { sort: 'popular', perPage: 8, page: 1 }),
    staleTime: 300_000,
    enabled: items.length > 0,
  });
  const suggestions = (crossQ.data?.items ?? [])
    .filter((p) => !items.some((it) => it.productId === p.id))
    .slice(0, 4);

  const busyId = update.isPending ? (update.variables as { id: number } | undefined)?.id : undefined;

  if (isLoading) return <LoadingBlock text="Đang kiểm giỏ của bạn..." />;
  if (isError) {
    return (
      <div className="container section">
        <EmptyState icon="🫖" title="Chưa mở được giỏ bánh">
          <p className="small muted">{errMessage(error, 'Kết nối đến tiệm bị gián đoạn.')}</p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => refetch()}>
            <RotateCcw size={14} /> Thử lại
          </button>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="Giỏ bánh"
        title="Giỏ bánh của bạn"
        subtitle="Kiểm tra số phần, lời chúc và ghi chú trước khi gửi cho bếp."
        crumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]}
      />

      <div className="container section section--tight">
        {awaiting.length > 0 && (
          <div className="cart-await" role="note">
            <div className="cart-await__txt">
              <b className="small">
                {awaiting.length === 1 ? `Đơn ${awaiting[0].code} đang chờ bạn thanh toán` : `Bạn có ${awaiting.length} đơn đang chờ thanh toán`}
              </b>
              <span className="tiny faint">Giỏ vẫn được giữ nguyên — trả tiếp đơn cũ, hoặc mua thêm rồi đặt đơn mới đều được.</span>
            </div>
            <Link to={`/thanh-toan/${awaiting[0].id}`} className="btn btn-gold btn-sm">
              Thanh toán tiếp <ArrowRight size={14} />
            </Link>
          </div>
        )}
        {items.length === 0 ? (
          <EmptyState icon="🧺" title="Giỏ hàng còn trống">
            <p className="small">Chọn mấy ổ bánh ngọt đưa vào giỏ nhé!</p>
            <Link to="/banh" className="btn btn-primary">Chọn bánh ngay</Link>
          </EmptyState>
        ) : (
          <>
            <div className="cart-wrap">
              <Reveal as="div" className="card pad cart-panel">
                <Stagger>
                  {items.map((it) => {
                    const productTo = it.productSlug ? `/san-pham/${it.productSlug}` : '/banh';
                    return (
                      <div key={it.id} className={`cart-line${unpicked.has(it.id) ? ' is-unpicked' : ''}`}>
                        <label className="cart-line__pick">
                          <input
                            type="checkbox"
                            checked={!unpicked.has(it.id)}
                            onChange={() => togglePick(it.id)}
                            aria-label={`Chọn ${it.productName} để đặt`}
                          />
                        </label>

                        <div className="cart-line__media img-frame">
                          <img src={imageUrl(it.imageUrl, it.productName)} onError={imgFallback(it.productName)} alt={it.productName} loading="lazy" />
                        </div>

                        <div className="cart-line__info">
                          {/* Link phủ toàn dòng: chạm chỗ nào cũng mở được trang chi tiết */}
                          <Link to={productTo} className="cart-line__name">{it.productName}</Link>
                          <div className="small muted">{it.variantName}</div>
                          {it.options?.messageOnCake && (
                            <div className="cart-line__msg">Lời chúc: “{it.options.messageOnCake}”</div>
                          )}
                          {it.options?.notes && <div className="small muted">Ghi chú: {it.options.notes}</div>}
                          {it.options?.referenceImageUrl && (
                            <div className="cart-line__ref small muted">
                              <img src={it.options.referenceImageUrl} alt="Ảnh tham khảo" />
                              Ảnh tham khảo đã đính kèm
                            </div>
                          )}
                          <div className="small faint">{formatVND(it.unitPrice)} / phần</div>
                        </div>

                        <div className="cart-line__qty">
                          <div className="qty-stepper qty-stepper--sm">
                            <button
                              type="button"
                              onClick={() => update.mutate({ id: it.id, quantity: Math.max(1, it.quantity - 1) }, { onError: (e) => toast(errMessage(e), 'err') })}
                              aria-label={`Giảm số lượng ${it.productName}`}
                              disabled={it.quantity <= 1 || busyId === it.id}
                            >
                              <Minus size={14} />
                            </button>
                            <output aria-live="polite">{it.quantity}</output>
                            <button
                              type="button"
                              onClick={() => update.mutate({ id: it.id, quantity: Math.min(MAX_CART_QUANTITY, it.quantity + 1) }, { onError: (e) => toast(errMessage(e), 'err') })}
                              aria-label={`Tăng số lượng ${it.productName}`}
                              disabled={it.quantity >= MAX_CART_QUANTITY || busyId === it.id}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => remove.mutate(it.id, { onError: (e) => toast(errMessage(e), 'err') })}
                            aria-label={`Xóa ${it.productName} khỏi giỏ`}
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>

                        <div className="cart-line__price">{formatVND(it.lineTotal)}</div>
                      </div>
                    );
                  })}
                </Stagger>

                <div className="cart-panel__foot">
                  <Link to="/banh" className="btn btn-ghost btn-sm">
                    <ArrowLeft size={14} /> Tiếp tục chọn bánh
                  </Link>
                  <div className="cart-panel__sum">
                    <div className="small muted">
                      {allSelected
                        ? 'Phí giao và khuyến mãi tính ở bước thanh toán.'
                        : `Đang chọn ${selected.length}/${items.length} dòng để đặt. Phí giao và khuyến mãi tính ở bước thanh toán.`}
                    </div>
                    <div className="cart-total">{formatVND(allSelected ? subtotal : selectedSubtotal)}</div>
                  </div>
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => setConfirmClear(true)} title="Làm trống giỏ">
                    <Trash2 size={14} /> Xóa tất cả
                  </button>
                </div>
              </Reveal>

              <aside className="card pad cart-aside">
                <span className="eyebrow no-rule">Tạm tính</span>
                <div className="cart-total cart-total--big">{formatVND(allSelected ? subtotal : selectedSubtotal)}</div>
                <p className="small muted">
                  {allSelected
                    ? `${items.reduce((n, it) => n + it.quantity, 0)} phần bánh • ${items.length} dòng đơn.`
                    : `${selected.reduce((n, it) => n + it.quantity, 0)} phần bánh • ${selected.length}/${items.length} dòng được chọn đặt.`}
                </p>
                {!allSelected && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUnpicked(new Set())}>
                    <RotateCcw size={14} /> Chọn lại tất cả
                  </button>
                )}

                <ShipProgress min={settings?.freeShippingMinVnd} subtotal={subtotal} />

                <div className="cart-aside__cta">
                  {eligibleCheckout ? (
                    <button type="button" className="btn btn-primary btn-lg btn-block" onClick={goCheckout}>
                      Đặt bánh ngay <ArrowRight size={16} className="btn-ico" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-lg btn-block"
                      onClick={() => navigate('/dang-nhap', { state: { next: '/gio-hang' } })}
                    >
                      <ShoppingBasket size={16} /> Đăng nhập để đặt bánh
                    </button>
                  )}
                </div>
                {!eligibleCheckout && (
                  <p className="small faint">
                    Giỏ hàng đang lưu theo cookie; khi đăng nhập, giỏ được gộp vào tài khoản của bạn.
                  </p>
                )}
              </aside>
            </div>

            {suggestions.length > 0 && (
              <section className="cart-cross">
                <Reveal className="section-head section-head--center">
                  <div className="section-head__text">
                    <span className="eyebrow">Chọn thêm chút ngọt</span>
                    <h2>Khách thường mua kèm</h2>
                    <span className="section-head__rule" aria-hidden />
                  </div>
                </Reveal>
                <Stagger className="grid-products">
                  {suggestions.map((p) => <ProductCard key={p.id} p={p} />)}
                </Stagger>
              </section>
            )}

            {/* CTA dính đáy cho màn hình nhỏ */}
            <div className="mobile-buy-bar is-show">
              <div className="mobile-buy-bar__info">
                <span className="mobile-buy-bar__name">
                  Tạm tính • {selected.reduce((n, it) => n + it.quantity, 0)} phần
                  {!allSelected && ` của ${selected.length}/${items.length} dòng`}
                </span>
                <b className="mobile-buy-bar__price">{formatVND(allSelected ? subtotal : selectedSubtotal)}</b>
              </div>
              {eligibleCheckout ? (
                <button type="button" className="btn btn-primary" onClick={goCheckout}>
                  Đặt bánh ngay <ArrowRight size={15} className="btn-ico" />
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => navigate('/dang-nhap', { state: { next: '/gio-hang' } })}>
                  Đăng nhập để đặt
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clear.mutate(undefined, {
            onSuccess: () => toast('Đã làm trống giỏ hàng', 'info'),
            onError: (e) => toast(errMessage(e), 'err'),
          });
          setConfirmClear(false);
        }}
        title="Làm trống giỏ hàng?"
        message="Tất cả bánh trong giỏ sẽ được lấy ra. Lời chúc và ghi chú kèm theo cũng sẽ mất — bạn chắc chứ?"
        confirmLabel="Xóa tất cả"
        cancelLabel="Giữ lại"
        danger
        pending={clear.isPending}
      />
    </>
  );
}
