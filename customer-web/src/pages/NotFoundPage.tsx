/** Trang 404 của storefront */
import { Link } from 'react-router-dom';
import { Home, UtensilsCrossed } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Reveal } from '../components/ui';

export default function NotFoundPage() {
  return (
    <section className="nf-page grain">
      <div className="petals" aria-hidden>
        {[12, 28, 44, 61, 77, 90].map((left, i) => (
          <span
            key={left}
            className="petal"
            style={{ left: `${left}%`, animationDelay: `${i * 2.4}s`, '--dur-fall': `${13 + i}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="container nf-inner">
        <Reveal from="scale">
          <div className="nf-code" aria-hidden>404</div>
        </Reveal>
        <Reveal from="soft" delay={80}>
          <h1 className="nf-title">Trang này đã được khách ăn rỗng mất rồi</h1>
        </Reveal>
        <Reveal from="soft" delay={150}>
          <p className="lede nf-text">Link bạn nhập có thể đã đổi hoặc bị bỏ. Chọn bánh thay thế ngay nhé!</p>
        </Reveal>
        <Reveal from="soft" delay={220}>
          <div className="nf-actions">
            <Link to="/" className="btn btn-ghost btn-lg"><Home size={15} /> Trang chủ</Link>
            <Link to="/banh" className="btn btn-gold btn-lg"><UtensilsCrossed size={15} /> Xem bánh</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
