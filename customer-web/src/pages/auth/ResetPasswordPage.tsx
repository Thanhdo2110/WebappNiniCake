/** Đặt mật khẩu lại theo mã 6 số */
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { post, errMessage } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

export default function ResetPasswordPage() {
  const location = useLocation() as { state?: { email?: string } };
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  useSeo({ title: 'Đặt lại mật khẩu' });

  const resetM = useMutation({
    mutationFn: () => post('/auth/reset-password', { email, code, password }),
    onSuccess: (r) => {
      toast(r.message || 'Mật khẩu đã được cập nhật!', 'ok');
      navigate('/dang-nhap');
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  return (
    <AuthShell
      eyebrow="Mật khẩu mới"
      title="Đặt lại mật khẩu"
      subtitle="Mã gồm 6 chữ số được tiệm ghi ra (demo) hoặc gửi qua email."
      footer={<Link to="/dang-nhap" className="link-gold">← Về đăng nhập</Link>}
    >
      <form onSubmit={(e) => { e.preventDefault(); resetM.mutate(); }}>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Mã xác nhận</label>
          <input className="input input-otp" required pattern="\d{6}" placeholder="123456" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="field">
          <label>Mật khẩu mới (từ 8 ký tự)</label>
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={resetM.isPending}>
          {resetM.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </AuthShell>
  );
}
