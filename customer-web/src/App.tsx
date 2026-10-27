/** Định tuyến storefront Nini Cakes: khung shell, chuyển trang, tiến trình cuộn */
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './hooks/scroll';
import { useReducedMotion, useScrolled, useScrollProgress } from './hooks/motion';
import { mountRipple } from './lib/ripple';
import { useAuth } from './hooks/auth';
import { LoadingBlock } from './components/ui';

import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FaqPage from './pages/FaqPage';
import PoliciesPage from './pages/PoliciesPage';
import PostDetailPage from './pages/PostDetailPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AccountLayout from './pages/account/AccountLayout';
import ProfilePage from './pages/account/ProfilePage';
import AddressesPage from './pages/account/AddressesPage';
import OrdersPage from './pages/account/OrdersPage';
import OrderDetailPage from './pages/account/OrderDetailPage';
import WishlistPage from './pages/account/WishlistPage';
import MyReviewsPage from './pages/account/MyReviewsPage';
import NotFoundPage from './pages/NotFoundPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { logged, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingBlock text="Đang kiểm tra phiên đăng nhập..." />;
  if (!logged) return <Navigate to="/dang-nhap" replace state={{ next: location.pathname + location.search }} />;
  return <>{children}</>;
}

function ScrollCue() {
  const progress = useScrollProgress();
  const show = useScrolled(520);
  const reduced = useReducedMotion();
  return (
    <>
      <div className="progress-top" style={{ transform: `scaleX(${progress})` }} aria-hidden />
      <button
        type="button"
        className={`to-top${show ? ' is-show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
        aria-label="Lên đầu trang"
      >
        <ArrowUp size={18} />
      </button>
    </>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => mountRipple(), []);

  return (
    <div className="site-shell">
      <div className="site-bg grain" aria-hidden>
        <span className="site-bg__wash site-bg__wash--a" />
        <span className="site-bg__wash site-bg__wash--b" />
        <span className="site-bg__wash site-bg__wash--c" />
      </div>
      <ScrollToTop />
      <ScrollCue />
      <Header />
      <main className="site-main" key={location.pathname}>
        <div className="page">
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/banh" element={<ProductsPage />} />
            <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
            <Route path="/gio-hang" element={<CartPage />} />
            <Route path="/thanh-toan" element={<RequireAuth><CheckoutPage /></RequireAuth>} />

            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/dat-lai-mat-khau" element={<ResetPasswordPage />} />

            <Route path="/tai-khoan" element={<RequireAuth><AccountLayout /></RequireAuth>}>
              <Route index element={<ProfilePage />} />
              <Route path="dia-chi" element={<AddressesPage />} />
              <Route path="don-hang" element={<OrdersPage />} />
              <Route path="don-hang/:id" element={<OrderDetailPage />} />
              <Route path="yeu-thich" element={<WishlistPage />} />
              <Route path="danh-gia" element={<MyReviewsPage />} />
            </Route>

            <Route path="/ve-nini" element={<AboutPage />} />
            <Route path="/lien-he" element={<ContactPage />} />
            <Route path="/chinh-sach" element={<PoliciesPage />} />
            <Route path="/cau-hoi" element={<FaqPage />} />
            <Route path="/bai-viet/:slug" element={<PostDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}
