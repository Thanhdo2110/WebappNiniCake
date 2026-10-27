/** Header: ribbon thương hiệu, nav kính mờ thu gọn khi cuộn, mega menu danh mục, drawer mobile */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, Cake, CakeSlice, Cherry, Cookie, Croissant, ChevronDown, Clock, Flower2, Menu, PartyPopper, Phone, Search, ShoppingBasket, User, X } from 'lucide-react';
import { useAuth } from '../hooks/auth';
import { useCart } from '../hooks/cart';
import { useCategories, useSettings } from '../hooks/catalog';
import { useScrolled } from '../hooks/motion';
import { useToast } from '../hooks/toast';
import { formatVND } from '../lib/format';

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

export function Header() {
  const { logged, user, logout } = useAuth();
  const { data: cart } = useCart();
  const { data: categories } = useCategories();
  const { data: settings } = useSettings();
  const [catOpen, setCatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const condensed = useScrolled(28);
  const navigate = useNavigate();
  const { toast } = useToast();
  const closeTimer = useRef<number | null>(null);

  const count = cart?.items?.length ?? 0;
  const firstName = user?.fullName?.trim().split(/\s+/).pop() || 'Tài khoản';
  const freeShip = settings?.freeShippingMinVnd;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

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

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!q.trim()) return;
    navigate(`/banh?q=${encodeURIComponent(q.trim())}`);
    setDrawer(false);
  };

  return (
    <header className={`site-head${condensed ? ' is-condensed' : ''}`}>
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
          <span className="brand__mark" aria-hidden>N</span>
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
          >
            <NavLink
              to="/banh"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              aria-expanded={catOpen}
              onFocus={() => openMenu('cat')}
              onBlur={() => closeMenu('cat')}
            >
              Thực đơn <ChevronDown size={14} className={`nav-link__chev${catOpen ? ' is-open' : ''}`} />
            </NavLink>

            <div className={`mega${catOpen ? ' is-open' : ''}`} role="menu" aria-label="Danh mục bánh">
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
                      <Link key={c.id} role="menuitem" to={`/banh?category=${c.slug}`} className="mega__item" onClick={() => setCatOpen(false)}>
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

        <form className="head-search" onSubmit={submitSearch} role="search">
          <Search size={15} aria-hidden />
          <input
            className="head-search__input"
            placeholder="Tìm bánh…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm kiếm bánh"
          />
        </form>

        <div className="head-actions">
          <Link to="/gio-hang" className="head-icon-btn" aria-label={`Giỏ hàng, ${count} sản phẩm`}>
            <ShoppingBasket size={19} />
            {count > 0 && <span className="cart-badge pop" key={count}>{count}</span>}
          </Link>

          {logged ? (
            <div
              className="head-user"
              onMouseEnter={() => openMenu('user')}
              onMouseLeave={() => closeMenu('user')}
            >
              <button
                type="button"
                className="head-user__btn"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                onFocus={() => openMenu('user')}
                onBlur={() => closeMenu('user')}
                onKeyDown={(e) => { if (e.key === 'Escape') setUserOpen(false); }}
              >
                <span className="head-user__mark" aria-hidden><User size={15} /></span>
                <span className="head-user__name">{firstName}</span>
              </button>
              <div className={`drop-menu${userOpen ? ' is-open' : ''}`} role="menu" aria-label="Tài khoản">
                <Link role="menuitem" to="/tai-khoan" className="drop-menu__item">Hồ sơ của tôi</Link>
                <Link role="menuitem" to="/tai-khoan/don-hang" className="drop-menu__item">Đơn hàng của tôi</Link>
                <Link role="menuitem" to="/tai-khoan/yeu-thich" className="drop-menu__item">Danh sách yêu thích</Link>
                <button
                  role="menuitem"
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

        <button
          type="button"
          className="nav-burger"
          aria-label={drawer ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={drawer}
          onClick={() => setDrawer((v) => !v)}
        >
          {drawer ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className={`nav-drawer${drawer ? ' is-open' : ''}`}>
        <form className="head-search head-search--mobile" onSubmit={submitSearch} role="search">
          <Search size={15} aria-hidden />
          <input
            className="head-search__input"
            placeholder="Tìm bánh yêu thích…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm kiếm bánh"
          />
        </form>
        <nav className="nav-drawer__links" aria-label="Điều hướng mobile">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>Trang chủ</NavLink>
          <NavLink to="/banh" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>Thực đơn</NavLink>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setDrawer(false)}>
              {l.label}
            </NavLink>
          ))}
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
    </header>
  );
}
