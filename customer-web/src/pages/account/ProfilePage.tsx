/** Hồ sơ cá nhân: thông tin, đổi mật khẩu, thống kê mua hàng */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Crown, Gem, Receipt, ShieldCheck } from 'lucide-react';
import type { ProfileStatsDTO, PublicUserDTO } from '@shared/types';
import { formatVND } from '../../lib/format';
import { get, patch, errMessage } from '../../lib/api';
import { useAuth } from '../../hooks/auth';
import { useToast } from '../../hooks/toast';
import { Reveal } from '../../components/ui';
import { useCountUp } from '../../hooks/motion';

interface ProfileResponse {
  user: PublicUserDTO;
  stats: ProfileStatsDTO;
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: () => get<ProfileResponse>('/auth/me'),
  });

  const u = profileQ.data?.user || user;
  const stats = profileQ.data?.stats;
  const orders = useCountUp<HTMLDivElement>(stats?.orderCount ?? 0);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!u) return;
    setFullName(u.fullName);
    setPhone(u.phone || '');
    setAvatarUrl(u.avatarUrl || '');
  }, [u]);

  const saveM = useMutation({
    mutationFn: () => patch<PublicUserDTO>('/auth/me', { fullName, phone: phone || undefined, avatarUrl: avatarUrl || undefined }),
    onSuccess: (r) => {
      setUser(r.data);
      toast(r.message || 'Hồ sơ đã được cập nhật.', 'ok');
      qc.setQueryData(['profile'], (old: ProfileResponse | undefined) => old ? { ...old, user: r.data } : old);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const changePwM = useMutation({
    mutationFn: () => patch('/auth/me/password', { currentPassword, newPassword }),
    onSuccess: (r) => {
      toast(r.message || 'Mật khẩu đã thay đổi, vui lòng đăng nhập lại.', 'ok');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const diamond = (stats?.totalSpent ?? 0) >= 3_000_000;

  return (
    <div className="account-page">
      <div className="stat-row">
        <Reveal from="scale" className="card stat-card">
          <span className="stat-card__icon"><Receipt size={16} /></span>
          <div className="stat-card__label">Số đơn đã đặt</div>
          <div className="stat-card__value" ref={orders.ref}>{orders.value}</div>
        </Reveal>
        <Reveal from="scale" delay={80} className="card stat-card">
          <span className="stat-card__icon"><Gem size={16} /></span>
          <div className="stat-card__label">Tổng đã mua</div>
          <div className="stat-card__value">{formatVND(stats?.totalSpent ?? null)}</div>
        </Reveal>
        <Reveal from="scale" delay={160} className="card stat-card">
          <span className="stat-card__icon"><Crown size={16} /></span>
          <div className="stat-card__label">Hạng thành viên</div>
          <div className={`stat-card__value stat-card__value--tier${diamond ? ' is-diamond' : ''}`}>
            {diamond ? 'Kim cương' : 'Thành viên bạc'}
          </div>
        </Reveal>
      </div>

      <Reveal as="div" className="card pad form-card">
        <h3>Hồ sơ của bạn</h3>
        <form onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
          <div className="field">
            <label>Họ tên</label>
            <input className="input" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label>Số điện thoại</label>
            <input className="input" value={phone} pattern="0\d{8,10}" placeholder="09xxxxxxxx" onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Ảnh đại diện (URL)</label>
            <input className="input" value={avatarUrl} placeholder="https://..." onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="small muted form-card__locked">
            <ShieldCheck size={14} /> Email: <b>{u?.email}</b> (không đổi được)
          </div>
          <button className="btn btn-primary" disabled={saveM.isPending}>Lưu hồ sơ</button>
        </form>
      </Reveal>

      <Reveal as="div" delay={60} className="card pad form-card">
        <h3>Đổi mật khẩu</h3>
        <form onSubmit={(e) => { e.preventDefault(); changePwM.mutate(); }}>
          <div className="field">
            <label>Mật khẩu hiện tại</label>
            <input className="input" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Mật khẩu mới (từ 8 ký tự)</label>
            <input className="input" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="btn btn-ghost" disabled={changePwM.isPending}>Đổi mật khẩu</button>
        </form>
      </Reveal>
    </div>
  );
}
