/** Đăng ký tài khoản khách — kiểm tra tại chỗ, xác nhận mật khẩu, đồng ý điều khoản */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import type { PublicUserDTO } from '@shared/types';
import { post, errMessage, TOKEN_KEY } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { PasswordInput } from '../../components/ui';
import { useAuth } from '../../hooks/auth';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';
import { registerSchema } from '../../lib/validation';
import type { RegisterForm } from '../../lib/validation';

export default function RegisterPage() {
  const { logged, setUser } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', phone: '', password: '', confirmPassword: '', terms: false as unknown as true },
  });

  useSeo({ title: 'Đăng ký', description: 'Tạo tài khoản Nini Cakes bằng số điện thoại để tích điểm và theo dõi đơn bánh.' });

  const regM = useMutation({
    mutationFn: (v: RegisterForm) =>
      post<{ accessToken: string; user: PublicUserDTO }>('/auth/register', {
        fullName: v.fullName, phone: v.phone, password: v.password,
      }),
    onSuccess: (r) => {
      localStorage.setItem(TOKEN_KEY, r.data.accessToken);
      setUser(r.data.user);
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast(r.message || 'Đăng ký thành công. Xin chào quý khách!', 'ok');
      navigate('/tai-khoan', { replace: true });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  if (logged) return <Navigate to="/tai-khoan" replace />;

  return (
    <AuthShell
      eyebrow="Bắt đầu"
      title="Tạo tài khoản"
      subtitle="Chỉ cần số điện thoại và mật khẩu — chưa tới 30 giây."
      footer={
        <Link to="/dang-nhap" className="link-gold">Đã có tài khoản →</Link>
      }
    >
      <form onSubmit={handleSubmit((v) => regM.mutate(v))} noValidate>
        <div className="field">
          <label htmlFor="rg-name">Họ và tên</label>
          <input id="rg-name" className={`input${errors.fullName ? ' is-invalid' : ''}`} maxLength={80}
            placeholder="Nguyễn Bảo Vy" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
          {errors.fullName && <span className="form-error">{errors.fullName.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="rg-phone">Số điện thoại (dùng để đăng nhập)</label>
          <input id="rg-phone" className={`input${errors.phone ? ' is-invalid' : ''}`} inputMode="tel"
            placeholder="09xxxxxxxx" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <span className="form-error">{errors.phone.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="rg-password">Mật khẩu (ít nhất 4 ký tự)</label>
          <PasswordInput id="rg-password" autoComplete="new-password"
            aria-invalid={!!errors.password} {...register('password')} />
          {errors.password && <span className="form-error">{errors.password.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="rg-confirm">Nhập lại mật khẩu</label>
          <PasswordInput id="rg-confirm" autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
        </div>
        <label className="check-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" {...register('terms')} aria-invalid={!!errors.terms} />
          <span className="small">
            Tôi đồng ý với <Link to="/chinh-sach" className="link-gold">điều khoản &amp; chính sách</Link> của Nini Cakes
          </span>
        </label>
        {errors.terms && <span className="form-error" style={{ display: 'block', marginTop: -6, marginBottom: 10 }}>{errors.terms.message}</span>}
        {regM.isError && (
          <p className="error-box small" role="alert" style={{ marginBottom: 14 }}>
            <AlertCircle size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
            {errMessage(regM.error)}
          </p>
        )}
        <button className="btn btn-gold btn-block btn-lg" disabled={regM.isPending}>
          {regM.isPending ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
      </form>
    </AuthShell>
  );
}
