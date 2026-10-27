/** Quên mật khẩu: gửi mã 6 số (dev ghi ra console server) */
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { post, errMessage } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  useSeo({ title: 'Quên mật khẩu' });

  const forgotM = useMutation({
    mutationFn: () => post('/auth/forgot-password', { email }),
    onSuccess: (r) => {
      toast(r.message || 'Đã tạo mã đặt lại. Kiểm tra console của server hoặc email.', 'ok');
      navigate('/dat-lai-mat-khau', { state: { email } });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  return (
    <AuthShell
      eyebrow="Khôi phục"
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký — tiệm gửi mã 6 chữ số để đặt mật khẩu mới. Trong môi trường demo, mã được hiển thị trên console của server."
      footer={<Link to="/dang-nhap" className="link-gold">← Về đăng nhập</Link>}
    >
      <form onSubmit={(e) => { e.preventDefault(); forgotM.mutate(); }}>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={forgotM.isPending}>
          {forgotM.isPending ? 'Đang gửi mã...' : 'Gửi mã đặt lại'}
        </button>
      </form>
    </AuthShell>
  );
}
