/** Khối đánh giá: avatar viết tắt, sao, ngày, ảnh, phản hồi của tiệm */
import type { ReactNode } from 'react';
import { MessageSquare } from 'lucide-react';
import { Stars } from './ui';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'N';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function ReviewCard({
  author,
  rating,
  date,
  comment,
  imageUrl,
  reply,
  aside,
  children,
}: {
  author: string;
  rating: number;
  date: string;
  comment?: string | null;
  imageUrl?: string | null;
  reply?: string | null;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="review-card">
      <span className="review-card__avatar" aria-hidden>{initials(author)}</span>
      <div className="review-card__main">
        <header className="review-card__head">
          <div className="review-card__who">
            <b className="review-card__name">{author}</b>
            <span className="review-card__stars"><Stars value={rating} size={15} /></span>
          </div>
          <div className="review-card__side">
            <time className="small muted">{date}</time>
            {aside}
          </div>
        </header>

        {comment && <p className="review-card__text">{comment}</p>}
        {imageUrl && (
          <div className="review-card__media img-frame">
            <img src={imageUrl} alt={`Ảnh khách gửi kèm đánh giá của ${author}`} loading="lazy" />
          </div>
        )}
        {reply && (
          <div className="review-card__reply">
            <span className="review-card__reply-label"><MessageSquare size={13} /> Nini Cakes trả lời</span>
            <p>{reply}</p>
          </div>
        )}
        {children}
      </div>
    </article>
  );
}
