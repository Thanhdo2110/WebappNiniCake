/** Định tuyến admin-web */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import AdminLayout from './components/AdminLayout';
import { Loading } from './components/ui';
import { useAdminAuth } from './hooks/auth';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProductsPage from './pages/ProductsPage';
import ProductEditorPage from './pages/ProductEditorPage';
import CategoriesPage from './pages/CategoriesPage';
import IngredientsPage from './pages/IngredientsPage';
import CouponsPage from './pages/CouponsPage';
import ReviewsPage from './pages/ReviewsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import StaffPage from './pages/StaffPage';
import BannersPage from './pages/BannersPage';
import PostsPage from './pages/PostsPage';
import MessagesPage from './pages/MessagesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

function Gate({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { token, user } = useAdminAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  if (!user) return <Loading text="Đang lấy phiên quản trị..." />;
  if (adminOnly && user.role !== 'ADMIN') {
    return <div className="container">
      <div className="error-box">Mục này chỉ dành cho quản trị viên (ADMIN). Tài khoản của bạn là nhân viên (STAFF).</div>
    </div>;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Gate><AdminLayout /></Gate>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<Gate adminOnly><ProductEditorPage /></Gate>} />
        <Route path="/products/:id" element={<ProductEditorPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/ingredients" element={<IngredientsPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/banners" element={<BannersPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/staff" element={<Gate adminOnly><StaffPage /></Gate>} />
        <Route path="/settings" element={<Gate adminOnly><SettingsPage /></Gate>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
