/** Đánh giá của tôi: xem + xóa */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import type { ReviewDTO } from '@shared/types';
import { formatDate } from '../../lib/format';
import { get, del, errMessage } from '../../lib/api';
import { EmptyState, LoadingBlock, Reveal, StatusPill, Stagger } from '../../components/ui';
import { ReviewCard } from '../../components/ReviewCard';
import { useToast } from '../../hooks/toast';

interface MyReviewRow extends ReviewDTO {
  product: { id: number; name: string; slug: string } | null;
  isApproved?: boolean;
}

export default function MyReviewsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => get<MyReviewRow[]>('/reviews/mine'),
  });

  const removeM = useMutation({
    mutationFn: (id: number) => del(`/reviews/${id}`),
    onSuccess: (r) => {
      toast(r.message || 'Đã xóa đánh giá.', 'ok');
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = query.data || [];

  return (
    <div className="account-page">
      <Reveal as="div" className="account-page__head">
        <div>
          <span className="eyebrow">Cảm nhận</span>
          <h3 className="account-page__title">Đánh giá của bạn</h3>
        </div>
      </Reveal>

      {query.isLoading && <LoadingBlock />}

      {!query.isLoading && items.length === 0 && (
        <EmptyState icon="⭐" title="Bạn chưa viết đánh giá nào">
          <Link to="/banh" className="btn btn-gold btn-sm">Chọn bánh &amp; chia sẻ cảm nhận</Link>
        </EmptyState>
      )}

      <Stagger className="review-mine">
        {items.map((r) => (
          <div key={r.id} className="card pad review-mine__card">
            {r.product && (
              <Link to={`/san-pham/${r.product.slug}`} className="review-mine__product">
                <span className="eyebrow no-rule">Bánh đã đánh giá</span>
                <b>{r.product.name}</b>
              </Link>
            )}
            <ReviewCard
              author={r.user?.fullName || 'Khách tiệm'}
              rating={r.rating}
              date={formatDate(r.createdAt)}
              comment={r.comment}
              imageUrl={r.imageUrl}
              reply={r.reply}
              aside={(
                <StatusPill color={r.isApproved === true ? '#55805A' : '#BF8A3C'}>
                  {r.isApproved === true ? 'Đã hiển thị' : 'Chờ duyệt'}
                </StatusPill>
              )}
            >
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeM.mutate(r.id)} disabled={removeM.isPending}>
                <Trash2 size={13} /> Xóa đánh giá
              </button>
            </ReviewCard>
          </div>
        ))}
      </Stagger>
    </div>
  );
}
