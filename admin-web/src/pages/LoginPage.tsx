/** Đăng nhập khu quản trị */
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { isSafeInternalPath } from '@shared';
import { useAdminAuth } from '../hooks/auth';
import { errMessage } from '../lib/api';
import { useToast } from '../hooks/toast';

export default function LoginPage() {
  const { token, signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { next?: string } };
  const { toast } = useToast();

  const submit = async () => {
    setBusy(true);
    try {
      await signIn(email, password);
      toast('Đăng nhập thành công. Chào quay lại Nini!', 'ok');
      const next = location.state?.next;
      navigate(isSafeInternalPath(next) ? next : '/', { replace: true });
    } catch (e) {
      toast(errMessage(e, 'Đăng nhập không thành công.'), 'err');
    } finally {
      setBusy(false);
    }
  };

  if (token) return <Navigate to="/" replace />;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #4a3a2c, #6f4e37 60%, #5b4636)',
    }}>
      <div className="card pad" style={{ width: 380, padding: '30px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 34 }}>🎂</div>
          <h1 style={{ fontSize: 21, margin: '4px 0' }}>Nini Cakes Quản trị</h1>
          <div className="small muted">Dành cho quản trị viên & nhân viên tiệm</div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="field">
            <label>Email quản trị</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ninicakes.vn" />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={busy}>
            {busy ? 'Đang kiểm tra...' : 'Vào bàn làm việc'}
          </button>
        </form>
      </div>
    </div>
  );
}
