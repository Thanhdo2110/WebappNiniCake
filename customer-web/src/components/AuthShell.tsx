/** Khung chung cho 4 trang đăng nhập / đăng ký / mật khẩu */
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Reveal } from './ui';
import { useSettings } from '../hooks/catalog';

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { data: settings } = useSettings();

  return (
    <div className="auth-shell">
      <div className="container auth-shell__inner">
        <Reveal from="left" className="auth-aside grain">
          <span className="auth-aside__pattern pattern-seigaiha" aria-hidden />
          <span className="eyebrow">Nini Cakes</span>
          <h2 className="auth-aside__title">{settings?.slogan || 'Hương Á – Âu trong từng chiếc bánh'}</h2>
          <p className="small auth-aside__lede">
            Một tài khoản nhỏ cho cả hành trình đặt bánh: lưu mẫu bạn thích, theo dõi đơn đã đặt và nhận vị mới theo mùa.
          </p>
          <ul className="auth-aside__list">
            <li><Check size={14} /> Xem trạng thái đơn theo từng công đoạn</li>
            <li><Check size={14} /> Lưu địa chỉ giao và lời chúc quen thuộc</li>
            <li><Check size={14} /> Đính ảnh mẫu bánh cho tiệm làm theo</li>
          </ul>
          <div className="auth-aside__seal" aria-hidden>
            <b>✦</b>
            <span>{settings?.openingHours || '08:00 – 20:00 cả tuần'}</span>
          </div>
        </Reveal>

        <Reveal from="right" as="section" className="card auth-card">
          <span className="eyebrow no-rule">{eyebrow}</span>
          <h1 className="auth-card__title">{title}</h1>
          {subtitle && <p className="small muted auth-card__sub">{subtitle}</p>}
          {children}
          {footer && <div className="auth-card__foot small">{footer}</div>}
        </Reveal>
      </div>
    </div>
  );
}
