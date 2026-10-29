/** Đăng nhập — kiểm tra tại chỗ, báo lỗi ngay dưới ô nhập */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, PhoneCall } from 'lucide-react';
import type { PublicUserDTO } from '@shared/types';
import { post, errMessage, TOKEN_KEY } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { PasswordInput } from '../../components/ui';
import { useAuth } from '../../hooks/auth';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';
import { loginSchema } from '../../lib/validation';
import type { LoginForm } from '../../lib/validation';

export default function LoginPage() {
  const { logged, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { next?: string } };
  const qc = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  useSeo({ title: 'Đăng nhập', description: 'Đăng nhập tài khoản Nini Cakes bằng số điện thoại để đặt bánh nhanh hơn.' });

  const loginM = useMutation({
    mutationFn: (v: LoginForm) => post<{ accessToken: string; user: PublicUserDTO }>('/auth/login', v),
    onSuccess: (r) => {
      localStorage.setItem(TOKEN_KEY, r.data.accessToken);
      setUser(r.data.user);
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast(r.message || 'Đăng nhập thành công!', 'ok');
      const next = location.state?.next;
      navigate(next && next.startsWith('/') ? next : '/tai-khoan', { replace: true });
    },
    onError: (e) => toast(errMessage(e, 'Số điện thoại hoặc mật khẩu chưa đúng.'), 'err'),
  });

  if (logged) return <Navigate to="/tai-khoan" replace />;

  return (
    <AuthShell
      eyebrow="Chào mừng lại"
      title="Đăng nhập"
      subtitle="Dùng số điện thoại đã đăng ký khi đặt bánh."
      footer={
        <>
          <Link to="/quen-mat-khau" className="link-gold">Quên mật khẩu?</Link>
          <span className="faint"> · </span>
          <Link to="/dang-ky" className="link-gold">Chưa có tài khoản →</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => loginM.mutate(v))} noValidate>
        <div className="field">
          <label htmlFor="lg-phone">Số điện thoại</label>
          <input
            id="lg-phone"
            className={`input${errors.phone ? ' is-invalid' : ''}`}
            inputMode="tel"
            placeholder="09xxxxxxxx"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
          {errors.phone && <span className="form-error">{errors.phone.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="lg-password">Mật khẩu</label>
          <PasswordInput
            id="lg-password"
            placeholder="••••"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <span className="form-error">{errors.password.message}</span>}
        </div>
        <p className="small muted form-card__locked">
          <PhoneCall size={14} />
          <span>Nếu bạn quên mật khẩu hãy alo cho shop ngay nhé. <Link to="/lien-he" className="link-gold">Vào Liên hệ!</Link></span>
        </p>
        {loginM.isError && (
          <p className="error-box small" role="alert" style={{ marginBottom: 14 }}>
            <AlertCircle size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
            {errMessage(loginM.error, 'Số điện thoại hoặc mật khẩu chưa đúng.')}
          </p>
        )}
        <button className="btn btn-primary btn-block btn-lg" disabled={loginM.isPending}>
          {loginM.isPending ? 'Đang kiểm tra...' : 'Đăng nhập'}
        </button>
      </form>
    </AuthShell>
  );
}
