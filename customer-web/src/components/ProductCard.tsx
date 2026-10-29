/** Thẻ bánh: nghiêng 3D theo con trỏ, ảnh zoom, khung vàng khi rê chuột */
import { Link } from 'react-router-dom';
import type { ProductListDTO } from '@shared/types';
import { ArrowRight } from 'lucide-react';
import { useTilt } from '../hooks/motion';
import { formatVND } from '../lib/format';
import { imageUrl, imgFallback } from '../lib/placeholder';
import { Stars } from './ui';

export function ProductCard({ p }: { p: ProductListDTO }) {
  const tiltRef = useTilt<HTMLDivElement>(5, 1.02);
  const sale = p.compareAtPrice !== null && p.compareAtPrice > p.price;
  const discount = sale ? Math.round((1 - p.price / (p.compareAtPrice ?? p.price)) * 100) : 0;

  return (
    <article className="p-card tilt-host">
      <div className="tilt-wrap">
        <div ref={tiltRef} className="card p-card__inner tilt card-foil">
          <div className="tilt-glare" />
          <Link to={`/san-pham/${p.slug}`} className="p-card__media img-frame" tabIndex={-1} aria-hidden>
            <img
              src={imageUrl(p.imageUrl, p.name)}
              onError={imgFallback(p.name)}
              alt={p.name}
              className="img-cover"
              loading="lazy"
              width={480}
              height={360}
            />
            <span className="p-card__tags">
              {sale && <span className="tag tag-blush">−{discount}%</span>}
              {p.isFeatured && <span className="tag tag-gold">Nổi bật</span>}
              {p.isSeasonal && <span className="tag tag-sage">Theo mùa</span>}
            </span>
            <span className="p-card__peek">Chọn bánh này <ArrowRight size={13} /></span>
          </Link>

          <div className="p-card__body">
            <span className="p-card__cat eyebrow no-rule">{p.categoryName || 'Bánh Nini'}</span>
            <h3 className="p-card__name">
              <Link to={`/san-pham/${p.slug}`}>{p.name}</Link>
            </h3>
            {p.shortDescription && <p className="p-card__desc small muted">{p.shortDescription}</p>}
            <div className="p-card__foot">
              <span className="p-card__price">
                <b>{formatVND(p.price)}</b>
                {sale && <s className="small faint">{formatVND(p.compareAtPrice)}</s>}
              </span>
              <Stars value={p.ratingAvg} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
