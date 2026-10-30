/** Header: ribbon thương hiệu, nav kính mờ thu gọn khi cuộn, mega menu danh mục,
    tìm kiếm có gợi ý, giỏ hàng mini (drawer), menu mobile chuẩn trợ năng. */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Cake, CakeSlice, Cherry, Cookie, Croissant, ChevronDown, Clock, Flower2,
  Menu, Minus, PartyPopper, Phone, Plus, Search, ShoppingBasket, Trash2, User, X,
} from 'lucide-react';
import type { ProductListDTO } from '@shared/types';
import { MAX_CART_QUANTITY } from '@shared/constants';
import { useAuth } from '../hooks/auth';
import { CART_ADDED_EVENT, useCart, useRemoveCartItem, useUpdateCartItem } from '../hooks/cart';
import { useCategories, useSettings } from '../hooks/catalog';
import { useScrolled } from '../hooks/motion';
import { useBodyScrollLock, useClickOutside, useFocusTrap } from '../hooks/a11y';
import { useToast } from '../hooks/toast';
import { formatVND } from '../lib/format';
import { get } from '../lib/api';
import { imgFallback, imageUrl } from '../lib/placeholder';
import { Overlay } from './Overlay';
import { ShipProgress } from './ShipProgress';

const LINKS = [
  { to: '/ve-nini', label: 'Về tiệm' },
  { to: '/cau-hoi', label: 'Hỏi đáp' },
  { to: '/lien-he', label: 'Liên hệ' },
];

/** Biểu tượng theo slug danh mục — fallback CakeSlice */
const CAT_ICONS: Record<string, typeof CakeSlice> = {
  'banh-kem': Cake,
  'banh-sinh-nhat': PartyPopper,
  'banh-ngot': Cookie,
  'banh-mi': Croissant,
  'banh-truyen-thong-a': Cherry,
  'banh-theo-mua': Flower2,
};

/* ---------- Ô tìm kiếm có gợi ý (combobox) ---------- */
function SearchBox({ mobile = false, onDone }: { mobile?: boolean; onDone?: () => void }) {
  const [value, setValue] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const wrapRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(value.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [value]);

  const { data, isFetching } = useQuery({
    queryKey: ['search-suggest', term],
    queryFn: () => get<{ items: ProductListDTO[] }>('/products', { q: term, perPage: 5, page: 1 }),
    enabled: open && term.length >= 2,
    staleTime: 30_000,
  });
  const items = data?.items ?? [];

  useEffect(() => setActive(-1), [term]);

  const finish = () => {
    setOpen(false);
    onDone?.();
  };

  const goProduct = (slug: string) => {
    finish();
    navigate(`/san-pham/${slug}`);
  };

  const submitAll = () => {
    const v = value.trim();
    if (!v) return;
    finish();
    navigate(`/banh?q=${encodeURIComponent(v)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
      return;
    }
    if (event.key === 'Enter') {
      if (open && active >= 0 && items[active]) {
        event.preventDefault();
        goProduct(items[active].slug);
      } else {
        submitAll();
      }
    }
  };

  const listId = mobile ? 'head-suggest-list-m' : 'head-suggest-list';
  const showPanel = open && value.trim().length >= 2;

  return (
    <div className="head-search-wrap" ref={wrapRef}>
      <form
        className={`head-search${mobile ? ' head-search--mobile' : ''}`}
        onSubmit={(e) => { e.preventDefault(); submitAll(); }}
        role="search"
      >
        <Search size={15} aria-hidden />
        <input
          className="head-search__input"
          placeholder={mobile ? 'Tìm bánh yêu thích…' : 'Tìm bánh…'}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Tìm kiếm bánh"
        />
        {value && (
          <button type="button" className="head-search__clear" onClick={() => { setValue(''); setOpen(false); }} aria-label="Xóa từ khóa">
            <X size={13} />
          </button>
        )}
      </form>

      {showPanel && (
        <div className="suggest drop">
          {isFetching && items.length === 0 ? (
            <div className="suggest__hint small muted">Đang tìm trong thực đơn…</div>
          ) : items.length ? (
            <>
              <ul className="suggest__list" id={listId} role="listbox" aria-label="Gợi ý tìm kiếm">
                {items.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={i === active} id={`${listId}-${p.id}`}>
                    <Link
                      className={`suggest__item${i === active ? ' is-active' : ''}`}
                      to={`/san-pham/${p.slug}`}
                      onClick={finish}
                      onMouseEnter={() => setActive(i)}
                    >
                      <img className="suggest__img" src={imageUrl(p.imageUrl, p.name)} alt="" loading="lazy" onError={imgFallback(p.name)} />
                      <span className="suggest__text">
                        <span className="suggest__name">{p.name}</span>
                        <span className="suggest__meta">
                          <b>{formatVND(p.price)}</b>
                          {p.compareAtPrice ? <s className="muted">{formatVND(p.compareAtPrice)}</s> : null}
                        </span>
                      </span>
                      <ArrowRight size={14} className="suggest__go" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" className="suggest__all" onClick={submitAll}>
                Xem tất cả kết quả cho “{value.trim()}” <ArrowRight size={13} />
              </button>
            </>
          ) : (
            <div className="suggest__hint small muted">
              Chưa tìm thấy bánh phù hợp.{' '}
              <button type="button" className="suggest__link" onClick={submitAll}>Xem tất cả kết quả</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Giỏ hàng mini (drawer cạnh phải) ---------- */
function MiniCart({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: cart, isLoading } = useCart();
  const { data: settings } = useSettings();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const navigate = useNavigate();
  const { toast } = useToast();

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const count = items.reduce((sum, it) => sum + it.quantity, 0);
  const busyId = updateItem.isPending ? (updateItem.variables as { id: number } | undefined)?.id : undefined;

  const setQty = (id: number, quantity: number) => {
    const next = Math.max(1, Math.min(MAX_CART_QUANTITY, quantity));
    updateItem.mutate({ id, quantity: next }, {
      onError: (e) => toast(`Không thể cập nhật số lượng: ${(e as Error).message}`, 'err'),
    });
  };

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="drawer-right"
      title={<><span className="eyebrow no-rule">Giỏ của bạn</span><span>{count > 0 ? `${count} bánh · ${items.length} dòng` : 'Chưa có bánh nào'}</span></>}
      footer={
        items.length > 0 ? (
          <div className="minicart__foot">
            <div className="minicart__subtotal">
              <span className="small muted">Tạm tính</span>
              <b>{formatVND(subtotal)}</b>
            </div>
            <div className="minicart__actions">
              <Link className="btn btn-ghost btn-sm" to="/gio-hang" onClick={onClose}>Xem giỏ hàng</Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => { onClose(); navigate('/thanh-toan'); }}
              >
                Thanh toán <ArrowRight size={14} className="btn-ico" />
              </button>
            </div>
            <p className="tiny faint" style={{ margin: '10px 0 0', textAlign: 'center' }}>
              Phí giao hàng &amp; ưu đãi chốt ở bước thanh toán.
            </p>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <div className="spinner" aria-label="Đang tải giỏ hàng" />
      ) : items.length === 0 ? (
        <div className="minicart__empty">
          <div className="empty-icon">🧺</div>
          <h3>Giỏ đang trống</h3>
          <p className="muted small">Thêm một chiếc bánh thơm ngon để bắt đầu đơn của bạn.</p>
          <Link className="btn btn-gold" to="/banh" onClick={onClose}>
            Chọn bánh ngay <ArrowRight size={14} className="btn-ico" />
          </Link>
        </div>
      ) : (
        <>
          <ShipProgress min={settings?.freeShippingMinVnd} subtotal={subtotal} />

          <ul className="minicart__list">
            {items.map((it) => {
              const productTo = it.productSlug ? `/san-pham/${it.productSlug}` : '/banh';
              return (
              <li className="minicart__line" key={it.id}>
                <Link className="minicart__media" to={productTo} onClick={onClose} aria-label={`Xem ${it.productName}`}>
                  <img src={imageUrl(it.imageUrl, it.productName)} alt="" loading="lazy" onError={imgFallback(it.productName)} />
                </Link>
                <div className="minicart__info">
                  <div className="minicart__name">
                    <Link to={productTo} onClick={onClose}>{it.productName}</Link>
                  </div>
                  {it.variantName && <div className="tiny muted">{it.variantName}</div>}
                  <div className="minicart__row">
                    <div className="qty-stepper qty-stepper--sm" aria-label={`Số lượng ${it.productName}`}>
                      <button
                        type="button"
                        onClick={() => setQty(it.id, it.quantity - 1)}
                        disabled={it.quantity <= 1 || busyId === it.id}
                        aria-label="Giảm một"
                      >
                        <Minus size={12} />
                      </button>
                      <output aria-live="polite">{it.quantity}</output>
                      <button
                        type="button"
                        onClick={() => setQty(it.id, it.quantity + 1)}
                        disabled={it.quantity >= MAX_CART_QUANTITY || busyId === it.id}
                        aria-label="Thêm một"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <b className="minicart__price">{formatVND(it.lineTotal)}</b>
                    <button
                      type="button"
                      className="minicart__remove"
                      onClick={() => removeItem.mutate(it.id, { onSuccess: () => toast('Đã xóa khỏi giỏ', 'info') })}
                      aria-label={`Xóa ${it.productName} khỏi giỏ`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        </>
      )}
    </Overlay>
  );
}

export function Header() {
  const { logged, user, logout } = useAuth();
  const { data: cart } = useCart();
  const { data: categories } = useCategories();
  const { data: settings } = useSettings();
  const [catOpen, setCatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const condensed = useScrolled(28);
  const navigate = useNavigate();
  const { toast } = useToast();
  const closeTimer = useRef<number | null>(null);

  const count = (cart?.items ?? []).reduce((sum, it) => sum + it.quantity, 0);

  /* Mỗi lần thêm giỏ từ danh sách: icon giỏ nảy lên và chữ "+1" bay lên.
     Đổi key để React dựng lại phần tử, nhờ đó animation chạy lại từ đầu. */
  const [bumpKey, setBumpKey] = useState(0);
  useEffect(() => {
    const onAdded = () => setBumpKey((n) => n + 1);
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdded);
  }, []);

  const firstName = user?.fullName?.trim().split(/\s+/).pop() || 'Tài khoản';
  const freeShip = settings?.freeShippingMinVnd;

  useBodyScrollLock(drawer);
  const drawerRef = useFocusTrap<HTMLDivElement>(drawer, () => setDrawer(false));

  /* Các trang (chi tiết bánh...) có thể yêu cầu mở giỏ mini sau khi thêm vào giỏ */
  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener('nc:open-cart', open);
    return () => window.removeEventListener('nc:open-cart', open);
  }, []);

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  const openMenu = (which: 'cat' | 'user') => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (which === 'cat') setCatOpen(true);
    else setUserOpen(true);
  };
  const closeMenu = (which: 'cat' | 'user') => {
    closeTimer.current = window.setTimeout(() => {
      if (which === 'cat') setCatOpen(false);
      else setUserOpen(false);
    }, 140);
  };
  const onMenuKey = (which: 'cat' | 'user') => (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (which === 'cat') setCatOpen(false);
      else setUserOpen(false);
    }
  };

  /* Link trỏ về chính trang đang xem (vd /banh?category=… từ mega menu) không làm
     đổi pathname nên ScrollToTop không chạy — đưa trang về đầu ngay tại đây */
  const onHeadClick = (e: { target: EventTarget | null }) => {
    if (e.target instanceof Element && e.target.closest('a[href]')) window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <header className={`site-head${condensed ? ' is-condensed' : ''}`} onClick={onHeadClick}>
      <div className="head-ribbon">
        <div className="head-ribbon__track">
          {[0, 1].map((dup) => (
            <div className="head-ribbon__set" key={dup} aria-hidden={dup === 1}>
              <span className="eyebrow no-rule">{settings?.slogan || 'Hương Á – Âu trong từng chiếc bánh'}</span>
              <span className="head-ribbon__dot">✦</span>
              {settings?.phone && (
                <span className="head-ribbon__item">
                  <Phone size={12} /> {settings.phone}
                </span>
              )}
              {settings?.openingHours && (
                <span className="head-ribbon__item">
                  <Clock size={12} /> {settings.openingHours}
                </span>
              )}
              {freeShip ? (
                <span className="head-ribbon__item">Miễn phí giao từ {formatVND(freeShip)}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="site-head__bar container">
        <Link to="/" className="brand">
          <img className="brand__mark brand__mark--img" src="/logo.png" alt="Logo Nini Cake" width={46} height={46} />
          <span className="brand__text">
            <span className="brand__name">
              Nini <i>Cakes</i>
            </span>
            <span className="brand__sub eyebrow no-rule">Pâtisserie Á – Âu</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Điều hướng chính">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Trang chủ
          </NavLink>

          <div
            className="nav-mega"
            onMouseEnter={() => openMenu('cat')}
            onMouseLeave={() => closeMenu('cat')}
            onFocus={() => openMenu('cat')}
            onBlur={() => closeMenu('cat')}
            onKeyDown={onMenuKey('cat')}
          >
            <NavLink
              to="/banh"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              aria-expanded={catOpen}
              aria-haspopup="true"
            >
              Thực đơn <ChevronDown size={14} className={`nav-link__chev${catOpen ? ' is-open' : ''}`} />
            </NavLink>

            <div className={`mega${catOpen ? ' is-open' : ''}`} aria-label="Danh mục bánh">
              <div className="mega__head">
                <span className="eyebrow no-rule">Danh mục bánh</span>
                <Link to="/banh" className="mega__seeall" onClick={() => setCatOpen(false)}>
                  Xem tất cả <ArrowRight size={13} />
                </Link>
              </div>
              {categories?.length ? (
                <div className="mega__grid">
                  {categories.map((c) => {
                    const Icon = CAT_ICONS[c.slug] ?? CakeSlice;
                    return (
                      <Link key={c.id} to={`/banh?category=${c.slug}`} className="mega__item" onClick={() => setCatOpen(false)}>
                        <span className="mega__icon"><Icon size={17} /></span>
                        <span className="mega__name">{c.name}</span>
                        <span className="mega__count">{c.productCount} loại</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mega__empty small muted">Tiệm đang cập nhật danh mục…</div>
              )}
              <div className="mega__quick">
                <Link to="/banh?featured=true" onClick={() => setCatOpen(false)}>Bánh nổi bật</Link>
                <Link to="/banh?seasonal=true" onClick={() => setCatOpen(false)}>Bánh theo mùa</Link>
                <Link to="/banh?sort=popular" onClick={() => setCatOpen(false)}>Bán chạy nhất</Link>
              </div>
            </div>
          </div>

          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="head-tools">
          <SearchBox />

          <div className="head-actions">
            <button
              type="button"
              className="head-icon-btn"
              aria-label={`Mở giỏ hàng, ${count} bánh`}
              aria-haspopup="dialog"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBasket size={19} />
              {count > 0 && <span className="cart-badge pop" key={`n-${count}`}>{count}</span>}
              {bumpKey > 0 && <span className="cart-plusone" key={`p-${bumpKey}`} aria-hidden>+1</span>}
            </button>

            {logged ? (
              <div
                className="head-user"
                onMouseEnter={() => openMenu('user')}
                onMouseLeave={() => closeMenu('user')}
                onFocus={() => openMenu('user')}
                onBlur={() => closeMenu('user')}
                onKeyDown={onMenuKey('user')}
              >
                <button
                  type="button"
                  className="head-user__btn"
                  aria-haspopup="true"
                  aria-expanded={userOpen}
                >
                  <span className="head-user__mark" aria-hidden><User size={15} /></span>
                  <span className="head-user__name">{firstName}</span>
                </button>
                <div className={`drop-menu${userOpen ? ' is-open' : ''}`} aria-label="Tài khoản">
                  <Link to="/tai-khoan" className="drop-menu__item" onClick={() => setUserOpen(false)}>Hồ sơ của tôi</Link>
                  <Link to="/tai-khoan/don-hang" className="drop-menu__item" onClick={() => setUserOpen(false)}>Đơn hàng của tôi</Link>
                  <Link to="/tai-khoan/yeu-thich" className="drop-menu__item" onClick={() => setUserOpen(false)}>Danh sách yêu thích</Link>
                  <button
                    type="button"
                    className="drop-menu__item is-danger"
                    onClick={async () => {
                      setUserOpen(false);
                      await logout();
                      toast('Đã đăng xuất. Hẹn gặp lại!', 'ok');
                      navigate('/');
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/dang-nhap" className="btn btn-primary btn-sm">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>

        <button
          type="button"
          className="nav-burger"
          aria-label={drawer ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={drawer}
          aria-controls="nav-drawer"
          onClick={() => setDrawer((v) => !v)}
        >
          {drawer ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div
        className={`nav-drawer__scrim${drawer ? ' is-open' : ''}`}
        onClick={() => setDrawer(false)}
        aria-hidden
      />
      <div className={`nav-drawer${drawer ? ' is-open' : ''}`} id="nav-drawer" ref={drawerRef} aria-hidden={!drawer}>
        <SearchBox mobile onDone={() => setDrawer(false)} />
        <nav className="nav-drawer__links" aria-label="Điều hướng mobile">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>Trang chủ</NavLink>
          <NavLink to="/banh" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>Thực đơn</NavLink>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>
              {l.label}
            </NavLink>
          ))}
          {logged && (
            <>
              <NavLink to="/tai-khoan" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>Tài khoản của tôi</NavLink>
              <NavLink to="/gio-hang" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>
                Giỏ hàng {count > 0 && <span className="muted small">({count})</span>}
              </NavLink>
            </>
          )}
        </nav>
        {!!categories?.length && (
          <div className="nav-drawer__cats">
            {categories.map((c) => (
              <Link key={c.id} to={`/banh?category=${c.slug}`} onClick={() => setDrawer(false)}>
                {c.name} <span className="muted small">({c.productCount})</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <MiniCart open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
