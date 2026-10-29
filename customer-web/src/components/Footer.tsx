/** Footer: dải cacao trầm, điều hướng, liên hệ, đăng ký nhận tin */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useSettings } from '../hooks/catalog';
import { post, errMessage } from '../lib/api';
import { useToast } from '../hooks/toast';
import { Reveal, Stagger } from './ui';
import { formatVND } from '../lib/format';

const NAV_MAIN = [
  { to: '/banh', label: 'Thực đơn bánh' },
  { to: '/ve-nini', label: 'Về Nini Cakes' },
  { to: '/lien-he', label: 'Liên hệ' },
  { to: '/cau-hoi', label: 'Câu hỏi thường gặp' },
];

const NAV_CARE = [
  { to: '/chinh-sach', label: 'Chính sách & quy định' },
  { to: '/gio-hang', label: 'Giỏ hàng' },
  { to: '/tai-khoan/don-hang', label: 'Đơn hàng của tôi' },
  { to: '/tai-khoan/yeu-thich', label: 'Món yêu thích' },
];

export function Footer() {
  const { data: s } = useSettings();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const sub = useMutation({
    mutationFn: (mail: string) => post('/newsletter', { email: mail }),
    onSuccess: (r) => {
      toast(r.message || 'Đăng ký nhận tin thành công. Cảm ơn quý khách!', 'ok');
      setEmail('');
      setEmailError('');
      setSubscribed(true);
    },
    onError: (e) => {
      setEmailError(errMessage(e));
      toast(errMessage(e), 'err');
    },
  });

  return (
    <footer className="site-foot grain">
      <div className="site-foot__pattern" aria-hidden />
      <div className="container site-foot__inner">
        <div className="foot-grid">
          <Reveal className="foot-brand" from="soft">
            <div className="brand brand--dark">
              <img className="brand__mark brand__mark--img" src="/logo.png" alt="Logo Nini Cake" width={46} height={46} />
              <span className="brand__text">
                <span className="brand__name">
                  Nini <i>Cakes</i>
                </span>
                <span className="brand__sub eyebrow no-rule">Pâtisserie Á – Âu</span>
              </span>
            </div>
            <p className="foot-slogan">{s?.slogan || 'Bánh kem nhẹ theo phong cách Á-Âu, làm thủ công mỗi ngày.'}</p>
            <ul className="foot-facts small">
              {s?.address && (
                <li>
                  <MapPin size={14} /> {s.address}
                </li>
              )}
              <li>
                <Phone size={14} /> <a href={`tel:${s?.phone}`}>{s?.phone || '—'}</a>
              </li>
              <li>
                <Mail size={14} /> <a href={`mailto:${s?.email}`}>{s?.email || '—'}</a>
              </li>
              <li>
                <Clock size={14} /> {s?.openingHours || '08:00 – 20:00 cả tuần'}
              </li>
            </ul>
            <div className="foot-social">
              {s?.facebook && (
                <a href={s.facebook} target="_blank" rel="noreferrer" className="foot-social__link" aria-label="Facebook">
                  <Facebook size={16} />
                </a>
              )}
              {s?.instagram && (
                <a href={s.instagram} target="_blank" rel="noreferrer" className="foot-social__link" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
              )}
              {s?.zalo && (
                <a href={s.zalo} target="_blank" rel="noreferrer" className="foot-social__link" aria-label="Zalo">
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
          </Reveal>

          <Stagger className="foot-col">
            <h4 className="foot-col__title eyebrow no-rule">Khám phá</h4>
            {NAV_MAIN.map((l) => (
              <Link key={l.to} to={l.to} className="foot-col__link">
                {l.label}
              </Link>
            ))}
          </Stagger>

          <Stagger className="foot-col">
            <h4 className="foot-col__title eyebrow no-rule">Chăm sóc khách</h4>
            {NAV_CARE.map((l) => (
              <Link key={l.to} to={l.to} className="foot-col__link">
                {l.label}
              </Link>
            ))}
          </Stagger>

          <Reveal className="foot-news" from="right">
            <h4 className="foot-col__title eyebrow no-rule">Thư vị mới mỗi mùa</h4>
            <p className="small">Để lại email, Nini gửi ưu đãi theo mùa và vị mới trước khi kịp lên kệ.</p>
            {subscribed ? (
              <div className="foot-news__done" role="status">
                <span className="foot-news__done-icon" aria-hidden><Check size={15} /></span>
                <span className="small">Đã đăng ký thành công — thư vị mới sẽ đến hộp email của bạn.</span>
              </div>
            ) : (
              <form
                className="foot-news__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const mail = email.trim();
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
                    setEmailError('Email chưa đúng định dạng (VD: ban@email.com)');
                    return;
                  }
                  setEmailError('');
                  sub.mutate(mail);
                }}
                noValidate
              >
                <input
                  className={`foot-news__input${emailError ? ' is-invalid' : ''}`}
                  placeholder="email@cua-ban.vn"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                  aria-label="Email nhận tin"
                  aria-invalid={!!emailError}
                />
                <button className="btn btn-gold btn-sm" type="submit" disabled={sub.isPending}>
                  <Send size={14} /> <span className="btn-ico">{sub.isPending ? 'Đang gửi…' : 'Gửi'}</span>
                </button>
              </form>
            )}
            {emailError && <span className="foot-news__err tiny" role="alert">{emailError}</span>}
            {s?.bankName && (
              <p className="small foot-news__bank">
                {s.bankName} • STK <b>{s.bankAccountNumber || '—'}</b> • {s.bankAccountName || '—'}
              </p>
            )}
            {s?.freeShippingMinVnd ? (
              <p className="small foot-news__ship">
                Giao {formatVND(s.shippingFeeVnd || 0)} • miễn phí đơn từ {formatVND(s.freeShippingMinVnd)}
              </p>
            ) : null}
          </Reveal>
        </div>

        <div className="foot-rule" aria-hidden />

        <div className="foot-meta small">
          <span>© {new Date().getFullYear()} Nini Cakes — Bánh ngọt thủ công. Giữ mọi quyền.</span>
          <span className="foot-meta__orn" aria-hidden>
            ✦ ✦ ✦
          </span>
          <Link to="/chinh-sach" className="foot-meta__link">
            Điều khoản &amp; chính sách
          </Link>
        </div>
      </div>
    </footer>
  );
}
