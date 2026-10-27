/** Bố cục khu vực tài khoản: menu trái có chỉ báo động + lời chào */
import { NavLink, Outlet } from 'react-router-dom';
import { Crown, Heart, MapPin, Receipt, Star, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/auth';
import { useSeo } from '../../lib/seo';
import { Reveal } from '../../components/ui';

const items = [
  { to: '/tai-khoan', label: 'Hồ sơ', icon: UserRound, end: true },
  { to: '/tai-khoan/don-hang', label: 'Đơn hàng', icon: Receipt, end: false },
  { to: '/tai-khoan/dia-chi', label: 'Sổ địa chỉ', icon: MapPin, end: false },
  { to: '/tai-khoan/yeu-thich', label: 'Yêu thích', icon: Heart, end: false },
  { to: '/tai-khoan/danh-gia', label: 'Đánh giá của tôi', icon: Star, end: false },
];

export default function AccountLayout() {
  const { user } = useAuth();
  useSeo({ title: 'Tài khoản của tôi', description: 'Quản lý hồ sơ, đơn hàng và địa chỉ trên Nini Cakes.' });
  const name = user?.fullName?.trim().split(/\s+/).pop() || 'bạn';

  return (
    <div className="container account-layout">
      <Reveal as="div" from="left" className="card account-card">
        <div className="account-card__hero">
          <span className="account-card__mark" aria-hidden>
            <Crown size={17} />
          </span>
          <div>
            <div className="eyebrow no-rule">Xin chào</div>
            <div className="account-card__name">{name}</div>
          </div>
        </div>
        <nav className="account-menu" aria-label="Menu tài khoản">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `account-menu__item${isActive ? ' active' : ''}`}>
              <it.icon size={16} aria-hidden />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
      </Reveal>
      <section className="account-content">
        <Outlet />
      </section>
    </div>
  );
}
