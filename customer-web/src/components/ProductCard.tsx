/** Thẻ bánh: nghiêng 3D theo con trỏ, ảnh zoom, cả thẻ bấm được, thêm giỏ ngay tại chỗ */
import { Link } from 'react-router-dom';
import type { ProductListDTO } from '@shared/types';
import { ArrowRight, Check, ShoppingBasket } from 'lucide-react';
import { useTilt } from '../hooks/motion';
import { announceCartAdded, useAddToCart } from '../hooks/cart';
import { useToast } from '../hooks/toast';
import { formatVND } from '../lib/format';
import { imageUrl, imgFallback } from '../lib/placeholder';
import { errMessage } from '../lib/api';
import { Stars } from './ui';

export function ProductCard({ p }: { p: ProductListDTO }) {
  const tiltRef = useTilt<HTMLDivElement>(5, 1.02);
  const addToCart = useAddToCart();
  const { toast } = useToast();
  const sale = p.compareAtPrice !== null && p.compareAtPrice > p.price;
  const discount = sale ? Math.round((1 - p.price / (p.compareAtPrice ?? p.price)) * 100) : 0;
  /* Mục "đã xem gần đây" đọc từ localStorage, bản lưu trước đây không có hai field
     mới nên phải kiểm tra kiểu số chứ không chỉ so khác null. */
  const buyable = typeof p.defaultVariantId === 'number' ? p.defaultVariantId : null;
  const manyPrices = typeof p.priceMax === 'number' && p.priceMax > p.price;

  const add = async () => {
    if (buyable === null) return;
    try {
      await addToCart.mutateAsync({ variantId: buyable, quantity: 1 });
      announceCartAdded(p.name);
      toast(`Đã thêm “${p.name}” vào giỏ`, 'ok');
    } catch (e) {
      toast(errMessage(e, 'Không thêm vào giỏ được.'), 'err');
    }
  };

  return (
    <article className="p-card tilt-host">
      <div className="tilt-wrap">
        <div ref={tiltRef} className="card p-card__inner tilt card-foil">
          <div className="tilt-glare" />
          <div className="p-card__media img-frame">
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
          </div>

          <div className="p-card__body">
            <span className="p-card__cat eyebrow no-rule">{p.categoryName || 'Bánh Nini'}</span>
            <h3 className="p-card__name">
              {/* Link duy nhất của cả thẻ ::after phủ toàn thẻ nên chạm điểm nào cũng mở được */}
              <Link to={`/san-pham/${p.slug}`}>{p.name}</Link>
            </h3>
            <div className="p-card__foot">
              <span className="p-card__price">
                {manyPrices && <i className="p-card__from">từ</i>}
                <b>{formatVND(p.price)}</b>
                {sale && <s className="small faint">{formatVND(p.compareAtPrice)}</s>}
              </span>
              {buyable !== null ? (
                <button
                  type="button"
                  className="p-card__buy"
                  onClick={add}
                  disabled={addToCart.isPending}
                  aria-label={`Thêm ${p.name} vào giỏ hàng`}
                >
                  {addToCart.isPending ? <Check size={14} /> : <ShoppingBasket size={14} />}
                  Thêm vào giỏ
                </button>
              ) : (
                <Stars value={p.ratingAvg} />
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
