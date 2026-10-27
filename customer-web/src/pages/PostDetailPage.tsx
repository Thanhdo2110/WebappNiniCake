/** Xem chi tiết một bài viết (câu chuyện / chính sách / FAQ) */
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { PostDetailDTO } from '@shared/types';
import { get } from '../lib/api';
import { CardSkeleton, EmptyState, Breadcrumb, Reveal } from '../components/ui';
import { formatDate } from '../lib/format';
import { useSeo } from '../lib/seo';

export default function PostDetailPage() {
  const { slug = '' } = useParams();
  const query = useQuery({
    queryKey: ['post', slug],
    queryFn: () => get<PostDetailDTO>(`/posts/${encodeURIComponent(slug)}`),
  });

  const p = query.data;
  useSeo({
    title: p?.title || 'Bài viết',
    description: p?.excerpt || undefined,
    image: p?.coverImageUrl,
  });

  if (query.isLoading) return <div className="container section container-narrow"><CardSkeleton count={2} /></div>;
  if (query.isError || !p) {
    return (
      <div className="container section">
        <EmptyState icon="📄" title="Không tìm thấy bài viết">
          <Link to="/" className="btn btn-primary btn-sm">Về trang chủ</Link>
        </EmptyState>
      </div>
    );
  }

  const typeLabel = p.type === 'POLICY' ? 'Chính sách' : p.type === 'FAQ' ? 'Hỏi đáp' : 'Câu chuyện';
  const backTo = p.type === 'POLICY' ? '/chinh-sach' : p.type === 'FAQ' ? '/cau-hoi' : '/ve-nini';

  return (
    <div className="container container-narrow post-page">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: typeLabel, to: backTo }, { label: p.title }]} />

      <Reveal as="article" from="soft" className="card post-article grain">
        {p.coverImageUrl && (
          <div className="post-article__cover img-frame">
            <img src={p.coverImageUrl} alt="" className="img-cover" />
          </div>
        )}
        <div className="post-article__body">
          <span className="tag tag-gold">{typeLabel}</span>
          <h1 className="post-article__title">{p.title}</h1>
          {p.excerpt && <p className="lede post-article__excerpt">{p.excerpt}</p>}
          <div className="small muted post-article__date">
            {p.publishedAt ? `Cập nhật ${formatDate(p.publishedAt)}` : 'Chưa xuất bản chính thức'}
          </div>
          <hr className="rule-gold" />
          <div className="post-article__content">{p.content}</div>
        </div>
      </Reveal>

      <p className="post-page__back">
        <Link to={backTo} className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Về {typeLabel.toLowerCase()}
        </Link>
        <Link to="/" className="btn btn-soft btn-sm">Trang chủ</Link>
      </p>
    </div>
  );
}
