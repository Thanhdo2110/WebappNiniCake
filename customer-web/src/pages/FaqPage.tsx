/** Câu hỏi thường gặp: accordion hoạt họa từ bài viết loại FAQ */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, RotateCcw } from 'lucide-react';
import type { PostSummaryDTO } from '@shared/types';
import { get, errMessage } from '../lib/api';
import { CardSkeleton, EmptyState, PageIntro, Reveal } from '../components/ui';
import { useSeo } from '../lib/seo';
import { useState } from 'react';

export default function FaqPage() {
  useSeo({ title: 'Hỏi đáp', description: 'Những câu hỏi hay gặp về đặt bánh, giao hàng và bảo quản bánh Nini Cakes.' });
  const [open, setOpen] = useState<number | null>(0);

  const query = useQuery({
    queryKey: ['posts', 'FAQ'],
    queryFn: () => get<PostSummaryDTO[]>('/posts', { type: 'FAQ' }),
  });

  const items = query.data || [];

  return (
    <>
      <PageIntro
        eyebrow="Hỏi đáp"
        title="Hỏi đáp nhanh"
        subtitle="Lướt nhanh những điều khách hay hỏi. Câu nào chưa có, nhắn tiệm trực tiếp nhé."
        crumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Hỏi đáp' }]}
        align="center"
      />

      <div className="container section section--tight container-narrow">
        {query.isLoading && <CardSkeleton count={3} />}

        {query.isError && (
          <EmptyState icon="🫖" title="Chưa tải được câu hỏi">
            <p className="small muted">{errMessage(query.error, 'Kết nối đến tiệm bị gián đoạn.')}</p>
            <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => query.refetch()}>
              <RotateCcw size={14} /> Thử lại
            </button>
          </EmptyState>
        )}

        {!query.isLoading && !query.isError && items.length === 0 && (
          <EmptyState icon="💬" title="Chưa có câu hỏi nào được đăng" />
        )}

        <div className="faq-list">
          {items.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.id} from="soft" delay={i * 40} as="div" className={`card faq-item${isOpen ? ' is-open' : ''}`}>
                <h3 className="faq-item__heading">
                  <button
                    type="button"
                    className="faq-item__q"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${f.id}`}
                    id={`faq-btn-${f.id}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className="faq-item__n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="faq-item__t">{f.title}</span>
                    <Plus size={18} className={`plus-minus${isOpen ? ' is-open' : ''}`} aria-hidden />
                  </button>
                </h3>
                <div
                  className={`collapsible${isOpen ? ' is-open' : ''}`}
                  id={`faq-panel-${f.id}`}
                  role="region"
                  aria-labelledby={`faq-btn-${f.id}`}
                >
                  <div>
                    <div className="faq-item__a">
                      {f.excerpt && <p className="small muted">{f.excerpt}</p>}
                      <Link to={`/bai-viet/${f.slug}`} className="link-gold small">Xem toàn bộ →</Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {items.length > 0 && (
          <Reveal className="faq-foot note-box" from="soft">
            Chưa thấy câu trả lời mình cần? <Link to="/lien-he">Nhắn cho tiệm</Link> — Nini trả lời trong ngày.
          </Reveal>
        )}
      </div>
    </>
  );
}
