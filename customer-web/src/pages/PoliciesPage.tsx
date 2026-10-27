/** Danh sách chính sách (bài viết loại POLICY) */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, ScrollText } from 'lucide-react';
import type { PostSummaryDTO } from '@shared/types';
import { get } from '../lib/api';
import { CardSkeleton, EmptyState, PageIntro, Reveal, Stagger } from '../components/ui';
import { formatDate } from '../lib/format';
import { useSeo } from '../lib/seo';

export default function PoliciesPage() {
  useSeo({ title: 'Chính sách', description: 'Chính sách đặt bánh, hoãn hủy, giao nhận và bảo quản của Nini Cakes.' });

  const query = useQuery({
    queryKey: ['posts', 'POLICY'],
    queryFn: () => get<PostSummaryDTO[]>('/posts', { type: 'POLICY' }),
  });

  const items = query.data || [];

  return (
    <>
      <PageIntro
        eyebrow="Quy định"
        title="Chính sách của tiệm"
        subtitle="Được biên soạn rõ ràng để hai bên luôn tiện nói chuyện"
        crumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Chính sách' }]}
      />

      <div className="container section section--tight">
        {query.isLoading && <CardSkeleton count={3} />}
        {!query.isLoading && items.length === 0 && (
          <EmptyState icon="📜" title="Chính sách đang được biên soạn" />
        )}

        <Stagger className="doc-list">
          {items.map((p) => (
            <article key={p.id} className="card doc-row">
              <span className="doc-row__mark"><ScrollText size={17} /></span>
              <div className="doc-row__body">
                <Link to={`/bai-viet/${p.slug}`} className="doc-row__title">{p.title}</Link>
                {p.excerpt && <p className="small muted">{p.excerpt}</p>}
                <div className="tiny faint">Cập nhật {formatDate(p.publishedAt)}</div>
              </div>
              <Link to={`/bai-viet/${p.slug}`} className="btn btn-soft btn-sm">
                Đọc <ArrowRight size={13} className="btn-ico" />
              </Link>
            </article>
          ))}
        </Stagger>

        {items.length > 0 && (
          <Reveal className="note-box doc-foot">
            Cần bản đầy đủ cho sự kiện lớn?{' '}
            <Link to="/lien-he" className="link-gold">Gửi yêu cầu</Link> để tiệm gửi file chi tiết.
          </Reveal>
        )}
      </div>
    </>
  );
}
