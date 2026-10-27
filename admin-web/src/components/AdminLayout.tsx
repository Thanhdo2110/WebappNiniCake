/** Layout quản trị: sidebar điều hướng + topbar người dùng */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/auth';
import { useToast } from '../hooks/toast';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { post } from '../lib/api';
import type { DashboardDTO } from '@shared/types';

export default function AdminLayout() {
  const { user, reset } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const dashQ = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get<DashboardDTO>('/admin/dashboard'),
    refetchInterval: 60_000,
  });

  const pendingCount = dashQ.data?.ordersPending ?? 0;
  const reviewCount = dashQ.data?.reviewsPending ?? 0;
  const messageCount = dashQ.data?.messagesUnread ?? 0;
  const lowStockCount = dashQ.data?.lowStock?.length ?? 0;

  const Dot = ({ n, tone }: { n: number; tone?: string }) =>
    n > 0 ? <span className={`badge-dot${tone ? ` badge-dot--${tone}` : ''}`}>{n}</span> : null;

  const logout = async () => {
    await post('/auth/logout').catch(() => undefined);
    reset();
    toast('Đã đăng xuất.', 'ok');
    navigate('/login');
  };

  const link = ({ isActive }: { isActive: boolean }) => `snav${isActive ? ' active' : ''}`;

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">🎂 Nini Quản trị</div>
        <nav>
          <NavLink to="/" end className={link}>📊 Tổng quan</NavLink>
          <NavLink to="/orders" className={link}>🧾 Đơn hàng <Dot n={pendingCount} /></NavLink>
          <NavLink to="/products" className={link}>🍰 Sản phẩm <Dot n={lowStockCount} tone="soft" /></NavLink>
          <NavLink to="/categories" className={link}>🗂️ Danh mục & nguyên liệu</NavLink>
          <NavLink to="/coupons" className={link}>🎟️ Khuyến mãi</NavLink>
          <NavLink to="/reviews" className={link}>⭐ Đánh giá <Dot n={reviewCount} tone="gold" /></NavLink>
          <NavLink to="/customers" className={link}>👥 Khách hàng</NavLink>
          <NavLink to="/banners" className={link}>🖼️ Banner</NavLink>
          <NavLink to="/posts" className={link}>📰 Bài viết</NavLink>
          <NavLink to="/messages" className={link}>✉️ Tin nhắn <Dot n={messageCount} tone="alert" /></NavLink>
          <NavLink to="/reports" className={link}>📈 Báo cáo</NavLink>
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/staff" className={link}>🧑‍💼 Nhân viên</NavLink>
              <NavLink to="/settings" className={link}>⚙️ Cài đặt tiệm</NavLink>
            </>
          )}
          <a className="snav" href="http://localhost:5173" target="_blank" rel="noreferrer">🛍️ Xem cửa hàng</a>
        </nav>
        <div className="foot">
          Đăng nhập: <b>{user?.fullName}</b><br />
          {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <strong style={{ fontSize: 14 }}>Khu vực quản lý Nini Cakes</strong>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="small muted">{user?.email}</span>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.fullName} style={{ width: 34, height: 34, borderRadius: 17, objectFit: 'cover' }} />
              : <span style={{ width: 34, height: 34, borderRadius: 17, background: 'var(--champagne)', color: '#4a3a2a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {user?.fullName?.[0] || 'N'}
                </span>}
            <button className="btn btn-outline btn-sm" onClick={logout}>Đăng xuất</button>
          </div>
        </header>
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}
