/** Đăng ký tài khoản khách */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { PublicUserDTO } from '@shared/types';
import { post, errMessage, TOKEN_KEY } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../hooks/auth';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

export default function RegisterPage() {
  const { logged } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const setUser = useAuth().setUser;

  useSeo({ title: 'Đăng ký', description: 'Tạo tài khoản Nini Cakes để tích điểm và theo dõi đơn bánh.' });

  const regM = useMutation({
    mutationFn: () => post<{ accessToken: string; user: PublicUserDTO }>('/auth/register', {
      fullName: name, email, password, phone: phone || undefined,
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
      subtitle="2 phút để có tài khoản — mua sau chỉ cần 1 chạm."
      footer={
        <Link to="/dang-nhap" className="link-gold">Đã có tài khoản →</Link>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); regM.mutate(); }}>
        <div className="field">
          <label>Họ và tên</label>
          <input className="input" required value={name} minLength={2} maxLength={80} placeholder="Nguyễn Bảo Vy" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} placeholder="ban@email.com" onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Số điện thoại (không bắt buộc)</label>
          <input className="input" value={phone} pattern="0\d{8,10}" placeholder="09xxxxxxxx" onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>Mật khẩu (ít nhất 8 ký tự)</label>
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-gold btn-block btn-lg" disabled={regM.isPending}>
          {regM.isPending ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
      </form>
    </AuthShell>
  );
}
