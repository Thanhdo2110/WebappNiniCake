/** Quên mật khẩu: gửi mã 6 số (dev ghi ra console server) */
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { post, errMessage } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';
import { forgotSchema } from '../../lib/validation';
import type { ForgotForm } from '../../lib/validation';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  useSeo({ title: 'Quên mật khẩu' });

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { phone: '' },
  });

  const forgotM = useMutation({
    mutationFn: (v: ForgotForm) => post('/auth/forgot-password', v),
    onSuccess: (r, v) => {
      toast(r.message || 'Đã tạo mã đặt lại. Kiểm tra console của server.', 'ok');
      navigate('/dat-lai-mat-khau', { state: { phone: v.phone } });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  return (
    <AuthShell
      eyebrow="Khôi phục"
      title="Quên mật khẩu"
      subtitle="Nhập số điện thoại đã đăng ký — tiệm tạo mã 6 chữ số để bạn đặt mật khẩu mới. Trong môi trường demo, mã được hiển thị trên console của server."
      footer={<Link to="/dang-nhap" className="link-gold">← Về đăng nhập</Link>}
    >
      <form onSubmit={handleSubmit((v) => forgotM.mutate(v))} noValidate>
        <div className="field">
          <label htmlFor="fp-phone">Số điện thoại</label>
          <input id="fp-phone" className={`input${errors.phone ? ' is-invalid' : ''}`} inputMode="tel"
            placeholder="09xxxxxxxx" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <span className="form-error">{errors.phone.message}</span>}
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={forgotM.isPending}>
          {forgotM.isPending ? 'Đang gửi mã...' : 'Gửi mã đặt lại'}
        </button>
      </form>
    </AuthShell>
  );
}
