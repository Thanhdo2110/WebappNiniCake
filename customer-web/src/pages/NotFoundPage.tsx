/** Trang 404 của storefront — có ô tìm kiếm và khay bánh bán chạy */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Home, Search, UtensilsCrossed } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Paginated, ProductListDTO } from '@shared/types';
import { Reveal, Stagger } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { get } from '../lib/api';
import { useSeo } from '../lib/seo';

export default function NotFoundPage() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  useSeo({ title: 'Không tìm thấy trang' });

  const popularQ = useQuery({
    queryKey: ['nf-popular'],
    queryFn: () => get<Paginated<ProductListDTO>>('/products', { sort: 'popular', perPage: 4, page: 1 }),
    staleTime: 300_000,
  });
  const popular = popularQ.data?.items ?? [];

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
          <p className="lede nf-text">Link bạn nhập có thể đã đổi hoặc bị bỏ. Tìm món khác hoặc chọn bánh thay thế ngay nhé!</p>
        </Reveal>
        <Reveal from="soft" delay={200}>
          <form
            className="nf-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const v = q.trim();
              if (v) navigate(`/banh?q=${encodeURIComponent(v)}`);
              else navigate('/banh');
            }}
          >
            <Search size={16} aria-hidden />
            <input
              className="nf-search__input"
              placeholder="Tìm bánh trong thực đơn…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Tìm bánh"
            />
            <button type="submit" className="btn btn-soft btn-sm">Tìm kiếm</button>
          </form>
        </Reveal>
        <Reveal from="soft" delay={260}>
          <div className="nf-actions">
            <Link to="/" className="btn btn-ghost btn-lg"><Home size={15} /> Trang chủ</Link>
            <Link to="/banh" className="btn btn-gold btn-lg"><UtensilsCrossed size={15} /> Xem bánh</Link>
          </div>
        </Reveal>

        {popular.length > 0 && (
          <div className="nf-popular">
            <Reveal from="soft">
              <p className="eyebrow nf-popular__title" style={{ justifyContent: 'center' }}>
                Đang được yêu thích
                <ArrowRight size={13} />
              </p>
            </Reveal>
            <Stagger className="grid-products">
              {popular.map((p) => <ProductCard key={p.id} p={p} />)}
            </Stagger>
          </div>
        )}
      </div>
    </section>
  );
}
