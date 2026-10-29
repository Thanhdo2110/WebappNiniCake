/** Định tuyến storefront Nini Cakes: khung shell, chuyển trang, tiến trình cuộn */
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './hooks/scroll';
import { useReducedMotion, useScrolled, useScrollProgress } from './hooks/motion';
import { mountRipple } from './lib/ripple';
import { useAuth } from './hooks/auth';
import { LoadingBlock } from './components/ui';

import HomePage from './pages/HomePage';

/* Tách bundle theo tuyến: khách vào trang chủ không phải tải code tài khoản/checkout */
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const WishlistPage = lazy(() => import('./pages/account/WishlistPage'));
const MyReviewsPage = lazy(() => import('./pages/account/MyReviewsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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
      <a className="skip-link" href="#site-content">Bỏ qua menu, tới nội dung chính</a>
      <div className="site-bg grain" aria-hidden>
        <span className="site-bg__wash site-bg__wash--a" />
        <span className="site-bg__wash site-bg__wash--b" />
        <span className="site-bg__wash site-bg__wash--c" />
      </div>
      <ScrollToTop />
      <ScrollCue />
      <Header />
      <main className="site-main" id="site-content" key={location.pathname}>
        <div className="page">
          <ErrorBoundary>
            <Suspense fallback={<LoadingBlock text="Đang chuẩn bị..." />}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/banh" element={<ProductsPage />} />
                <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
                <Route path="/gio-hang" element={<CartPage />} />
                <Route path="/thanh-toan" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
                <Route path="/thanh-toan/:id" element={<RequireAuth><PaymentPage /></RequireAuth>} />

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
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <Footer />
    </div>
  );
}
