/** Giỏ hàng: cộng/trừ/xóa dòng, hiện lời chúc & ghi chú, tổng tạm tính */
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../hooks/cart';
import { useAuth } from '../hooks/auth';
import { EmptyState, LoadingBlock, PageIntro, Reveal, Stagger } from '../components/ui';
import { formatVND } from '../lib/format';
import { imageUrl } from '../lib/placeholder';
import { MAX_CART_QUANTITY } from '@shared';

export default function CartPage() {
  const { data: cart, isLoading } = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const clear = useClearCart();
  const { logged } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <LoadingBlock text="Đang kiểm giỏ của bạn..." />;
  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const eligibleCheckout = logged;

  return (
    <>
      <PageIntro
        eyebrow="Giỏ bánh"
        title="Giỏ bánh của bạn"
        subtitle="Kiểm tra số phần, lời chúc và ghi chú trước khi gửi cho bếp."
        crumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]}
      />

      <div className="container section section--tight">
        {items.length === 0 ? (
          <EmptyState icon="🧺" title="Giỏ hàng còn trống">
            <p className="small">Chọn mấy ổ bánh ngọt đưa vào giỏ nhé!</p>
            <Link to="/banh" className="btn btn-primary">Chọn bánh ngay</Link>
          </EmptyState>
        ) : (
          <div className="cart-wrap">
            <Reveal as="div" className="card pad cart-panel">
              <Stagger>
                {items.map((it) => (
                  <div key={it.id} className="cart-line">
                    <Link to="/banh" className="cart-line__media img-frame">
                      <img src={imageUrl(it.imageUrl, it.productName)} alt={it.productName} loading="lazy" />
                    </Link>

                    <div className="cart-line__info">
                      <div className="cart-line__name">{it.productName}</div>
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
                      <div className="small faint">{formatVND(it.unitPrice)} / phần • còn {it.stock} phần</div>
                    </div>

                    <div className="cart-line__qty">
                      <div className="qty-stepper">
                        <button type="button" onClick={() => update.mutate({ id: it.id, quantity: Math.max(1, it.quantity - 1) })} aria-label="Trừ">
                          <Minus size={14} />
                        </button>
                        <output>{it.quantity}</output>
                        <button
                          type="button"
                          onClick={() => update.mutate({ id: it.id, quantity: Math.min(MAX_CART_QUANTITY, Math.min(it.quantity + 1, it.stock || it.quantity)) })}
                          aria-label="Cộng"
                          disabled={it.quantity >= MAX_CART_QUANTITY || it.quantity >= it.stock}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove.mutate(it.id)}>
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>

                    <div className="cart-line__price">{formatVND(it.lineTotal)}</div>
                  </div>
                ))}
              </Stagger>

              <div className="cart-panel__foot">
                <Link to="/banh" className="btn btn-ghost btn-sm">
                  <ArrowLeft size={14} /> Tiếp tục chọn bánh
                </Link>
                <div className="cart-panel__sum">
                  <div className="small muted">Phí giao và khuyến mãi tính ở bước thanh toán.</div>
                  <div className="cart-total">{formatVND(subtotal)}</div>
                </div>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => clear.mutate()} title="Làm trống giỏ">
                  <Trash2 size={14} /> Xóa tất cả
                </button>
              </div>
            </Reveal>

            <aside className="card pad cart-aside">
              <span className="eyebrow no-rule">Tạm tính</span>
              <div className="cart-total cart-total--big">{formatVND(subtotal)}</div>
              <p className="small muted">
                {items.reduce((n, it) => n + it.quantity, 0)} phần bánh • {items.length} dòng đơn.
              </p>
              <div className="cart-aside__cta">
                {eligibleCheckout ? (
                  <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/thanh-toan')}>
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
        )}
      </div>
    </>
  );
}
