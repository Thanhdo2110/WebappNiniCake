/** Đặt mật khẩu lại theo mã 6 số — ô OTP rời, gửi lại mã có đếm ngược */
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { post, errMessage } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { OtpInput, PasswordInput } from '../../components/ui';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';
import { resetSchema } from '../../lib/validation';
import type { ResetForm } from '../../lib/validation';

export default function ResetPasswordPage() {
  const location = useLocation() as { state?: { phone?: string } };
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);
  useSeo({ title: 'Đặt lại mật khẩu' });

  const { register, handleSubmit, control, formState: { errors }, getValues } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { phone: location.state?.phone || '', code: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const resetM = useMutation({
    mutationFn: (v: ResetForm) => post('/auth/reset-password', { phone: v.phone, code: v.code, password: v.newPassword }),
    onSuccess: (r) => {
      toast(r.message || 'Mật khẩu đã được cập nhật!', 'ok');
      navigate('/dang-nhap');
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const resendM = useMutation({
    mutationFn: () => post('/auth/forgot-password', { phone: getValues('phone') }),
    onSuccess: (r) => {
      toast(r.message || 'Đã gửi mã mới. Kiểm tra console của server.', 'ok');
      setCooldown(30);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  return (
    <AuthShell
      eyebrow="Mật khẩu mới"
      title="Đặt lại mật khẩu"
      subtitle="Mã gồm 6 chữ số được tiệm ghi ra console của server (bản demo chưa có nhà cung cấp SMS)."
      footer={<Link to="/dang-nhap" className="link-gold">← Về đăng nhập</Link>}
    >
      <form onSubmit={handleSubmit((v) => resetM.mutate(v))} noValidate>
        <div className="field">
          <label htmlFor="rs-phone">Số điện thoại</label>
          <input id="rs-phone" className={`input${errors.phone ? ' is-invalid' : ''}`} inputMode="tel"
            autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <span className="form-error">{errors.phone.message}</span>}
        </div>
        <div className="field">
          <span className="label" id="rs-code-label">Mã xác nhận</span>
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <OtpInput value={field.value} onChange={field.onChange} disabled={resetM.isPending} />
            )}
          />
          {errors.code && <span className="form-error">{errors.code.message}</span>}
          <button
            type="button"
            className="resend-code small"
            disabled={cooldown > 0 || resendM.isPending || !getValues('phone')}
            onClick={() => resendM.mutate()}
          >
            {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : resendM.isPending ? 'Đang gửi…' : 'Gửi lại mã'}
          </button>
        </div>
        <div className="field">
          <label htmlFor="rs-password">Mật khẩu mới (từ 4 ký tự)</label>
          <PasswordInput id="rs-password" autoComplete="new-password"
            aria-invalid={!!errors.newPassword} {...register('newPassword')} />
          {errors.newPassword && <span className="form-error">{errors.newPassword.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="rs-confirm">Nhập lại mật khẩu mới</label>
          <PasswordInput id="rs-confirm" autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
        </div>
        {resetM.isError && (
          <p className="error-box small" role="alert" style={{ marginBottom: 14 }}>
            <AlertCircle size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
            {errMessage(resetM.error, 'Mã chưa đúng hoặc đã hết hạn.')}
          </p>
        )}
        <button className="btn btn-primary btn-block btn-lg" disabled={resetM.isPending}>
          {resetM.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </AuthShell>
  );
}
