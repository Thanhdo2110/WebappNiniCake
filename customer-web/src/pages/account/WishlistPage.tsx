/** Danh sách yêu thích: xem + thêm vào giỏ + bỏ khỏi danh sách */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HeartCrack, RotateCcw, ShoppingBasket } from 'lucide-react';
import type { ProductDetailPageDTO, WishlistItemDTO } from '@shared/types';
import { formatVND } from '../../lib/format';
import { imageUrl, imgFallback } from '../../lib/placeholder';
import { get, post, del, errMessage } from '../../lib/api';
import { EmptyState, LoadingBlock, Reveal, Stars, Stagger } from '../../components/ui';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';

export default function WishlistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  useSeo({ title: 'Danh sách yêu thích', description: 'Những chiếc bánh bạn đã lưu lại trên Nini Cakes.' });

  const query = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => get<WishlistItemDTO[]>('/wishlist'),
  });

  const removeM = useMutation({
    mutationFn: (productId: number) => del(`/wishlist/${productId}`),
    onSuccess: (r) => {
      toast(r.message || 'Đã bỏ khỏi danh sách yêu thích.', 'ok');
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  /* Thêm vào giỏ: lấy biến thể đang bán đầu tiên của bánh */
  const addM = useMutation({
    mutationFn: async (item: WishlistItemDTO) => {
      const detail = await get<ProductDetailPageDTO>(`/products/${encodeURIComponent(item.slug)}`);
      const variant = detail.product.variants.find((v) => v.isActive);
      if (!variant) throw new Error('Bánh này đang tạm ngừng bán — ghé lại sau nhé!');
      await post('/cart/items', { variantId: variant.id, quantity: 1 });
      return item.name;
    },
    onSuccess: (name) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast(`Đã thêm “${name}” vào giỏ.`, 'ok');
      window.dispatchEvent(new CustomEvent('nc:open-cart'));
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = query.data || [];

  return (
    <div className="account-page">
      <Reveal as="div" className="account-page__head">
        <div>
          <span className="eyebrow">Đã lưu</span>
          <h3 className="account-page__title">Bánh bạn đã thương mến</h3>
        </div>
      </Reveal>

      {query.isLoading && <LoadingBlock text="Đang mở danh sách yêu thích..." />}

      {query.isError && (
        <EmptyState icon="🫖" title="Chưa mở được danh sách yêu thích">
          <p className="small muted">{errMessage(query.error, 'Kết nối đến tiệm bị gián đoạn.')}</p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => query.refetch()}>
            <RotateCcw size={14} /> Thử lại
          </button>
        </EmptyState>
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <EmptyState icon="💝" title="Danh sách còn trống">
          <Link to="/banh" className="btn btn-primary btn-sm">Ghé xem bánh cho vào đây</Link>
        </EmptyState>
      )}

      <Stagger className="wish-grid">
        {items.map((p) => (
          <article key={p.id} className="card wish-card">
            <Link to={`/san-pham/${p.slug}`} className="wish-card__media img-frame">
              <img src={imageUrl(p.imageUrl, p.name)} onError={imgFallback(p.name)} alt={p.name} className="img-cover" loading="lazy" />
            </Link>
            <div className="wish-card__body">
              <Link to={`/san-pham/${p.slug}`} className="wish-card__name">{p.name}</Link>
              <div className="wish-card__row">
                <b>{formatVND(p.price)}</b>
                <Stars value={p.ratingAvg} size={12} />
              </div>
              <div className="wish-card__actions">
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => addM.mutate(p)}
                  disabled={addM.isPending}
                >
                  <ShoppingBasket size={14} /> Thêm vào giỏ
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeM.mutate(p.id)}
                  disabled={removeM.isPending}
                  aria-label={`Bỏ ${p.name} khỏi danh sách yêu thích`}
                >
                  <HeartCrack size={14} /> Bỏ thích
                </button>
              </div>
            </div>
          </article>
        ))}
      </Stagger>
    </div>
  );
}
