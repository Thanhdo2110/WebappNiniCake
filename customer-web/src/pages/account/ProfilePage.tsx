/** Hồ sơ cá nhân: thông tin, ảnh đại diện tải lên, đổi mật khẩu, thống kê mua hàng */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Crown, Eye, EyeOff, Gem, Receipt, ShieldCheck, Upload } from 'lucide-react';
import type { ProfileStatsDTO, PublicUserDTO } from '@shared/types';
import { formatVND } from '../../lib/format';
import { get, patch, errMessage, uploadFile } from '../../lib/api';
import { useAuth } from '../../hooks/auth';
import { useToast } from '../../hooks/toast';
import { Reveal } from '../../components/ui';
import { useCountUp } from '../../hooks/motion';
import { useSeo } from '../../lib/seo';
import { VN_PHONE_REGEX } from '../../lib/validation';
import { imageUrl, imgFallback } from '../../lib/placeholder';

interface ProfileResponse {
  user: PublicUserDTO;
  stats: ProfileStatsDTO;
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  useSeo({ title: 'Hồ sơ của tôi', description: 'Cập nhật thông tin cá nhân và mật khẩu tài khoản Nini Cakes.' });

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
  const [phoneError, setPhoneError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!u) return;
    setFullName(u.fullName);
    setPhone(u.phone || '');
    setAvatarUrl(u.avatarUrl || '');
  }, [u]);

  const dirty = !!u && (fullName !== u.fullName || (phone || '') !== (u.phone || '') || (avatarUrl || '') !== (u.avatarUrl || ''));

  const saveM = useMutation({
    mutationFn: () => patch<PublicUserDTO>('/auth/me', { fullName, phone: phone || undefined, avatarUrl: avatarUrl || undefined }),
    onSuccess: (r) => {
      setUser(r.data);
      toast(r.message || 'Hồ sơ đã được cập nhật.', 'ok');
      qc.setQueryData(['profile'], (old: ProfileResponse | undefined) => old ? { ...old, user: r.data } : old);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { url } = await uploadFile(file);
      setAvatarUrl(url);
      toast('Đã tải ảnh đại diện lên. Bấm “Lưu hồ sơ” để áp dụng.', 'ok');
    } catch (e) {
      toast(errMessage(e), 'err');
    } finally {
      setUploadingAvatar(false);
    }
  };

  /** SĐT là thông tin đăng nhập nên không được để trống */
  const validatePhone = (v: string) => {
    if (!v) {
      setPhoneError('Số điện thoại cũng là tài khoản đăng nhập, không thể để trống');
      return;
    }
    setPhoneError(VN_PHONE_REGEX.test(v) ? '' : 'Số điện thoại chưa hợp lệ (VD: 0901234567)');
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
        <form onSubmit={(e) => { e.preventDefault(); validatePhone(phone); if (phoneError || !VN_PHONE_REGEX.test(phone)) return; saveM.mutate(); }}>
          <div className="avatar-row">
            <img className="avatar-row__img" src={imageUrl(avatarUrl || null, fullName || 'Nini')} onError={imgFallback(fullName || 'Nini')} alt="Ảnh đại diện" />
            <div className="avatar-row__side">
              <label className="file-drop">
                <input type="file" accept="image/*" disabled={uploadingAvatar}
                  onChange={(e) => { void pickAvatar(e.target.files?.[0]); e.target.value = ''; }} />
                <span className="file-drop__label">
                  <Upload size={15} /> {uploadingAvatar ? 'Đang tải ảnh lên…' : 'Tải ảnh đại diện'}
                </span>
              </label>
              <span className="tiny faint">hoặc dán URL ảnh bên dưới</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="pf-name">Họ tên</label>
            <input id="pf-name" className="input" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-phone">Số điện thoại (dùng để đăng nhập)</label>
            <input
              id="pf-phone"
              className={`input${phoneError ? ' is-invalid' : ''}`}
              value={phone}
              inputMode="tel"
              placeholder="09xxxxxxxx"
              aria-invalid={!!phoneError}
              onChange={(e) => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value); }}
              onBlur={(e) => validatePhone(e.target.value)}
            />
            {phoneError && <span className="form-error">{phoneError}</span>}
          </div>
          <div className="field">
            <label htmlFor="pf-avatar">Ảnh đại diện (URL)</label>
            <input id="pf-avatar" className="input" value={avatarUrl} placeholder="https://..." onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="small muted form-card__locked">
            <ShieldCheck size={14} /> Quý khách đăng nhập bằng chính số điện thoại này.
          </div>
          <div className="form-card__actions">
            <button className="btn btn-primary" disabled={saveM.isPending || !dirty}>
              {saveM.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}
            </button>
            {dirty && <span className="tiny faint">Có thay đổi chưa lưu</span>}
          </div>
        </form>
      </Reveal>

      <Reveal as="div" delay={60} className="card pad form-card">
        <h3>Đổi mật khẩu</h3>
        <form onSubmit={(e) => { e.preventDefault(); changePwM.mutate(); }}>
          <div className="field">
            <label htmlFor="pw-current">Mật khẩu hiện tại</label>
            <div className="input-with-toggle">
              <input id="pw-current" className="input" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pw-new">Mật khẩu mới (từ 4 ký tự)</label>
            <div className="input-with-toggle">
              <input id="pw-new" className="input" type={showPw ? 'text' : 'password'} required minLength={4} autoComplete="new-password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button className="btn btn-ghost" disabled={changePwM.isPending || !currentPassword || newPassword.length < 4}>
            {changePwM.isPending ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </form>
      </Reveal>
    </div>
  );
}
