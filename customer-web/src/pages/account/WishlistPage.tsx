/** Danh sách yêu thích: xem + bỏ khỏi danh sách */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HeartCrack } from 'lucide-react';
import type { WishlistItemDTO } from '@shared/types';
import { formatVND } from '../../lib/format';
import { imageUrl } from '../../lib/placeholder';
import { get, del, errMessage } from '../../lib/api';
import { EmptyState, LoadingBlock, Reveal, Stars, Stagger } from '../../components/ui';
import { useToast } from '../../hooks/toast';

export default function WishlistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

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

      {!query.isLoading && items.length === 0 && (
        <EmptyState icon="💝" title="Danh sách còn trống">
          <Link to="/banh" className="btn btn-primary btn-sm">Ghé xem bánh cho vào đây</Link>
        </EmptyState>
      )}

      <Stagger className="wish-grid">
        {items.map((p) => (
          <article key={p.id} className="card wish-card">
            <Link to={`/san-pham/${p.slug}`} className="wish-card__media img-frame">
              <img src={imageUrl(p.imageUrl, p.name)} alt={p.name} className="img-cover" loading="lazy" />
            </Link>
            <div className="wish-card__body">
              <Link to={`/san-pham/${p.slug}`} className="wish-card__name">{p.name}</Link>
              <div className="wish-card__row">
                <b>{formatVND(p.price)}</b>
                <Stars value={p.ratingAvg} size={12} />
              </div>
              <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={() => removeM.mutate(p.id)} disabled={removeM.isPending}>
                <HeartCrack size={14} /> Bỏ yêu thích
              </button>
            </div>
          </article>
        ))}
      </Stagger>
    </div>
  );
}
