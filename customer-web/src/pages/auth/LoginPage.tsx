/** Đăng nhập */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { PublicUserDTO } from '@shared/types';
import { post, errMessage, TOKEN_KEY } from '../../lib/api';
import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../hooks/auth';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

export default function LoginPage() {
  const { logged } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation() as { state?: { next?: string } };
  const qc = useQueryClient();
  const { toast } = useToast();
  const setUser = useAuth().setUser;

  useSeo({ title: 'Đăng nhập', description: 'Đăng nhập tài khoản Nini Cakes để đặt bánh nhanh hơn.' });

  const loginM = useMutation({
    mutationFn: () => post<{ accessToken: string; user: PublicUserDTO }>('/auth/login', { email, password }),
    onSuccess: (r) => {
      localStorage.setItem(TOKEN_KEY, r.data.accessToken);
      setUser(r.data.user);
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast(r.message || 'Đăng nhập thành công!', 'ok');
      const next = location.state?.next;
      navigate(next && next.startsWith('/') ? next : '/tai-khoan', { replace: true });
    },
    onError: (e) => toast(errMessage(e, 'Email hoặc mật khẩu chưa đúng.'), 'err'),
  });

  if (logged) return <Navigate to="/tai-khoan" replace />;

  return (
    <AuthShell
      eyebrow="Chào mừng lại"
      title="Đăng nhập"
      subtitle="Nếu bạn mua lần cuối gần đây, hãy dùng cùng email nhé."
      footer={
        <>
          <Link to="/quen-mat-khau" className="link-gold">Quên mật khẩu?</Link>
          <span className="faint"> · </span>
          <Link to="/dang-ky" className="link-gold">Chưa có tài khoản →</Link>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); loginM.mutate(); }}>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" />
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={loginM.isPending}>
          {loginM.isPending ? 'Đang kiểm tra...' : 'Đăng nhập'}
        </button>
      </form>
    </AuthShell>
  );
}
