/** Chi tiết bánh: bộ sưu tập 3D + lightbox, biến thể, lời chúc, ảnh tham khảo,
    giỏ hàng (buy box + thanh CTA mobile), đánh giá, bánh liên quan. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, Croissant, Minus, Plus,
  RotateCcw, Star, X, ZoomIn,
} from 'lucide-react';
import type { IngredientDTO, ProductListDTO, ProductDetailPageDTO, ProductReviewsDTO } from '@shared/types';
import { MAX_CART_QUANTITY } from '@shared';
import { formatVND, formatDate, formatRating } from '../lib/format';
import { imageUrl, imgFallback } from '../lib/placeholder';
import { get, post, errMessage } from '../lib/api';
import { LoadingBlock, EmptyState, Stars, Breadcrumb, Reveal, SectionTitle, Stagger } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { ReviewCard } from '../components/ReviewCard';
import { Pagination } from '../components/Pagination';
import { useAddToCart } from '../hooks/cart';
import { useAuth } from '../hooks/auth';
import { useToast } from '../hooks/toast';
import { useTilt } from '../hooks/motion';
import { useBodyScrollLock, useFocusTrap } from '../hooks/a11y';
import { useSeo } from '../lib/seo';
import { pushRecentlyViewed } from '../lib/recent';

const RATE_LABELS = ['', 'Rất tệ', 'Chưa ổn', 'Bình thường', 'Khá hài lòng', 'Rất tốt'];

/* ---------- Lightbox ảnh bánh ---------- */
function Lightbox({ items, start, name, onClose }: { items: string[]; start: number; name: string; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, items.length - 1));
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);
  useBodyScrollLock(true);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => (n + 1) % items.length);
      if (e.key === 'ArrowLeft') setI((n) => (n - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  const prev = () => setI((n) => (n - 1 + items.length) % items.length);
  const next = () => setI((n) => (n + 1) % items.length);

  return createPortal(
    <div className="lightbox" ref={trapRef} role="dialog" aria-modal="true" aria-label={`Ảnh của ${name}`}>
      <div className="lightbox__scrim" onClick={onClose} aria-hidden />
      <button type="button" className="lightbox__x" onClick={onClose} aria-label="Đóng ảnh">
        <X size={20} />
      </button>
      {items.length > 1 && (
        <>
          <button type="button" className="lightbox__arrow lightbox__arrow--prev" onClick={prev} aria-label="Ảnh trước">
            <ChevronLeft size={22} />
          </button>
          <button type="button" className="lightbox__arrow lightbox__arrow--next" onClick={next} aria-label="Ảnh kế tiếp">
            <ChevronRight size={22} />
          </button>
        </>
      )}
      <figure
        className="lightbox__fig"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const delta = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(delta) > 44) (delta < 0 ? next : prev)();
        }}
      >
        <img key={items[i]} src={imageUrl(items[i], name)} onError={imgFallback(name)} alt={`${name} — ảnh ${i + 1}`} />
        <figcaption className="lightbox__count small">{i + 1} / {items.length}</figcaption>
      </figure>
      <div className="lightbox__name small" aria-hidden>{name}</div>
    </div>,
    document.body,
  );
}

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { logged, user } = useAuth();
  const { toast } = useToast();
  const galleryTilt = useTilt<HTMLDivElement>(4, 1.01);

  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: () => get<ProductDetailPageDTO>(`/products/${encodeURIComponent(slug)}`),
  });

  const p = query.data?.product;
  const [variantId, setVariantId] = useState<number | null>(null);
  const [shot, setShot] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');

  /* Buy box có còn trên màn hình không → hiện thanh CTA mobile khi không */
  const buyRef = useRef<HTMLDivElement>(null);
  const [buyVisible, setBuyVisible] = useState(true);
  const stageTouch = useRef<number | null>(null);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setBuyVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [query.dataUpdatedAt]);

  /* Đổi sang bánh khác thì đặt lại lựa chọn */
  useEffect(() => {
    setVariantId(null); setShot(0); setQty(1); setMessage(''); setNotes('');
  }, [slug]);

  /* Ghi vào "đã xem gần đây" cho rail cá nhân hóa ở trang chủ */
  useEffect(() => {
    if (!p) return;
    const asList: ProductListDTO = {
      id: p.id, name: p.name, slug: p.slug, shortDescription: p.shortDescription,
      categoryId: p.categoryId, categoryName: p.categoryName ?? null, price: p.price,
      compareAtPrice: p.compareAtPrice, isFeatured: p.isFeatured, isSeasonal: p.isSeasonal,
      isActive: p.isActive, soldCount: p.soldCount, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
      imageUrl: p.imageUrl, createdAt: new Date().toISOString(),
    };
    pushRecentlyViewed(asList);
  }, [p]);

  const customOptions = {
    messageOnCake: message.trim() || undefined,
    notes: notes.trim() || undefined,
  };

  useSeo({
    title: p?.name ?? 'Chi tiết bánh',
    description: p?.shortDescription || undefined,
    image: p?.imageUrl,
  });

  const addToCart = useAddToCart();

  const ingredientsQ = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => get<IngredientDTO[]>('/ingredients'),
    staleTime: 300_000,
    enabled: !!p,
  });

  const currentVariant = p && (variantId !== null
    ? p.variants.find((v) => v.id === variantId)
    : p.variants.find((v) => v.isActive) || p.variants[0]);

  const doAdd = () => {
    if (!currentVariant) return Promise.resolve();
    return addToCart.mutateAsync({ variantId: currentVariant.id, quantity: qty, options: customOptions });
  };

  const buyNow = async () => {
    try {
      await doAdd();
      navigate('/thanh-toan');
    } catch (e) {
      toast(errMessage(e), 'err');
    }
  };

  const addOnly = async () => {
    try {
      await doAdd();
      window.dispatchEvent(new CustomEvent('nc:open-cart'));
    } catch (e) {
      toast(errMessage(e), 'err');
    }
  };

  if (query.isLoading) return <LoadingBlock text="Tiệm đang bày bánh cho bạn xem..." />;
  if (query.isError || !p) {
    const status = (query.error as { response?: { status?: number } } | undefined)?.response?.status;
    return (
      <div className="container section">
        {status === 404 ? (
          <EmptyState icon="🫤" title="Không tìm thấy bánh này">
            <p className="small muted">Bánh có thể đã bán hết mùa hoặc đổi tên. Bạn xem thực đơn hiện tại nhé.</p>
            <Link to="/banh" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Về danh sách bánh</Link>
          </EmptyState>
        ) : (
          <EmptyState icon="🫖" title="Chưa kết nối được với tiệm">
            <p className="small muted">{errMessage(query.error, 'Đường truyền đang trục trặc, bạn thử lại nhé.')}</p>
            <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => query.refetch()}>
              <RotateCcw size={14} /> Thử lại
            </button>
          </EmptyState>
        )}
      </div>
    );
  }

  const images = p.images.filter((i) => i.url);
  const shown = images[Math.min(shot, Math.max(0, images.length - 1))];
  const lightboxItems = images.length
    ? images.map((i) => i.url).filter((u): u is string => !!u)
    : p.imageUrl ? [p.imageUrl] : [];
  const unavailable = !currentVariant || !currentVariant.isActive;
  const price = currentVariant?.price ?? p.price;
  const onSale = p.compareAtPrice !== null && p.compareAtPrice > price;
  const ingredientRows = p.ingredients
    .map((id) => ingredientsQ.data?.find((i) => i.id === id))
    .filter((i): i is IngredientDTO => !!i);

  const onStageTouch = {
    onTouchStart: (e: React.TouchEvent) => { stageTouch.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (stageTouch.current === null || images.length < 2) return;
      const delta = e.changedTouches[0].clientX - stageTouch.current;
      stageTouch.current = null;
      if (Math.abs(delta) > 44) {
        setShot((n) => (delta < 0 ? Math.min(n + 1, images.length - 1) : Math.max(n - 1, 0)));
      }
    },
  };

  const buyButtons = (
    <>
      <button type="button" className="btn btn-gold btn-lg" onClick={addOnly} disabled={unavailable || addToCart.isPending}>
        <Check size={16} /> {addToCart.isPending ? 'Đang thêm…' : unavailable ? 'Tạm ngừng bán' : 'Thêm vào giỏ'}
      </button>
      <button type="button" className="btn btn-primary btn-lg" onClick={buyNow} disabled={unavailable || addToCart.isPending}>
        {unavailable ? 'Không đặt được' : 'Mua ngay'} <ArrowRight size={16} className="btn-ico" />
      </button>
    </>
  );

  return (
    <div className="container detail-page">
      <Breadcrumb items={[
        { label: 'Trang chủ', to: '/' },
        { label: 'Tất cả bánh', to: '/banh' },
        ...(p.categoryName ? [{ label: p.categoryName }] : []),
        { label: p.name },
      ]} />

      <div className="detail-layout">
        <Reveal from="left" className="tilt-host detail-gallery">
          <div className="tilt-wrap">
            <div ref={galleryTilt} className="tilt detail-gallery__stage img-frame" {...onStageTouch}>
              <div className="tilt-glare" />
              <button
                type="button"
                className="detail-gallery__open"
                onClick={() => lightboxItems.length > 0 && setLightbox(Math.min(shot, lightboxItems.length - 1))}
                aria-label={`Phóng to ảnh của ${p.name}`}
              >
                <img
                  key={shown?.id ?? p.id}
                  src={imageUrl(shown?.url ?? p.imageUrl, p.name)}
                  onError={imgFallback(p.name)}
                  alt={shown?.alt || p.name}
                  className="detail-gallery__main"
                />
                <span className="detail-gallery__zoom"><ZoomIn size={15} /> Phóng to</span>
              </button>
              {p.isFeatured && <span className="detail-gallery__flag tag tag-gold">Bánh nổi bật</span>}
            </div>
          </div>
          {images.length > 1 && (
            <div className="detail-thumbs" role="group" aria-label="Chọn ảnh thu nhỏ">
              {images.slice(0, 6).map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  className={`detail-thumb${i === Math.min(shot, images.length - 1) ? ' is-active' : ''}`}
                  onClick={() => setShot(i)}
                  aria-label={`Xem ảnh ${i + 1} của ${p.name}`}
                  aria-current={i === shot}
                >
                  <img src={imageUrl(im.url, p.name)} onError={imgFallback(p.name)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </Reveal>

        <div className="detail-info">
          <Reveal from="soft">
            <span className="eyebrow">{p.categoryName || 'Bánh Nini'}</span>
            <h1 className="detail-info__title">{p.name}</h1>
          </Reveal>

          <Reveal from="soft" delay={70}>
            <div className="detail-info__rating">
              <Stars value={p.ratingAvg} size={16} />
              <a href="#danh-gia" className="small muted detail-info__rating-link">
                {p.ratingCount > 0
                  ? `${p.ratingCount} đánh giá • ${formatRating(p.ratingAvg)}/5`
                  : 'Mới có, chờ bạn là người đầu tiên đánh giá'}
              </a>
              {p.soldCount > 0 && <span className="small faint">· đã bán {p.soldCount} phần</span>}
            </div>
          </Reveal>

          {p.shortDescription && (
            <Reveal from="soft" delay={120}>
              <p className="lede">{p.shortDescription}</p>
            </Reveal>
          )}

          <Reveal from="soft" delay={170}>
            <div className="detail-price">
              <b>{formatVND(price)}</b>
              {onSale && <s className="small faint">{formatVND(p.compareAtPrice)}</s>}
              {onSale && <span className="tag tag-blush">Ưu đãi tuần này</span>}
            </div>
          </Reveal>

          {p.variants.filter((v) => v.isActive).length > 1 && (
            <Reveal from="soft" delay={210}>
              <div className="pick-block">
                <span className="pick-block__label" id="variant-label">Chọn kích cỡ / vị</span>
                <div className="pill-row" role="group" aria-labelledby="variant-label">
                  {p.variants.filter((v) => v.isActive).map((v) => (
                    <button key={v.id}
                      type="button"
                      className={`pill-select${currentVariant?.id === v.id ? ' is-selected' : ''}`}
                      aria-pressed={currentVariant?.id === v.id}
                      onClick={() => setVariantId(v.id)}>
                      <span className="pill-select__name">{v.name}{v.flavor ? ` – ${v.flavor}` : ''}</span>
                      <span className="pill-select__price">{formatVND(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {unavailable ? (
            <div className="error-box pick-note" role="alert">Phần bánh này đang <b>tạm ngừng bán</b>. Bạn chọn kích cỡ/vị khác, hoặc gọi hotline để tiệm làm riêng theo ngày bạn cần.</div>
          ) : (
            <p className="small muted pick-note">Bánh làm theo đơn — bạn chọn ngày và khung giờ nhận, tiệm chuẩn bị đúng khẩu phần.</p>
          )}

          <Reveal from="up" delay={120}>
            <div className="detail-facts">
              {(ingredientRows.length > 0 || (p.ingredients.length > 0 && ingredientsQ.isPending)) && (
                <div className="ing-block">
                  <span className="ing-block__label eyebrow no-rule">
                    <Croissant size={14} /> Thành phần chính
                  </span>
                  {ingredientRows.length > 0 ? (
                    <ul className="ing-grid">
                      {ingredientRows.map((ing) => (
                        <li key={ing.id} className="ing-item">
                          <span className="ing-item__name">{ing.name}</span>
                          {ing.note && <span className="ing-item__note">{ing.note}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="ing-grid" aria-hidden>
                      {Array.from({ length: Math.min(6, Math.max(3, p.ingredients.length)) }, (_, i) => (
                        <li key={i} className="ing-skel skeleton" />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </Reveal>

          <div className="detail-buy-wrap" ref={buyRef}>
            <Reveal from="up" delay={80}>
              <div className="card pad detail-buy">
                <div className="field">
                  <label htmlFor="cake-message">Lời chúc trên bánh (tối đa 60 ký tự)</label>
                  <input id="cake-message" className="input" value={message} maxLength={60} placeholder="VD: Chúc mừng sinh nhật Mẹ!" onChange={(e) => setMessage(e.target.value)} />
                  <div className="char-left small faint" aria-live="polite">{message.length}/60</div>
                </div>
                <div className="field">
                  <label htmlFor="cake-notes">Ghi chú riêng cho tiệm</label>
                  <textarea id="cake-notes" className="textarea" value={notes} maxLength={500} rows={2} placeholder="VD: Ít ngọt, trang trí hoa latte..." onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="buy-row">
                  <div className="qty-stepper">
                    <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Trừ đi" disabled={qty <= 1}><Minus size={15} /></button>
                    <input
                      className="qty-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={qty}
                      aria-label="Số phần bánh"
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D+/g, '');
                        setQty(digits === '' ? 1 : parseInt(digits, 10));
                      }}
                      onBlur={() => setQty(Math.max(1, Math.min(qty, MAX_CART_QUANTITY)))}
                    />
                    <button type="button" onClick={() => setQty(Math.min(MAX_CART_QUANTITY, qty + 1))} aria-label="Cộng thêm"><Plus size={15} /></button>
                  </div>
                  {buyButtons}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {p.description && (
        <Reveal className="story-band grain">
          <div className="story-band__pattern pattern-seigaiha" aria-hidden />
          <div className="story-band__inner">
            <span className="eyebrow">Chuyện của tiệm</span>
            <h3>Câu chuyện của từng phần bánh</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p>
          </div>
        </Reveal>
      )}

      <ReviewsSection slug={slug} productId={p.id} initialReviews={query.data!.reviews} logged={logged} userName={user?.fullName || ''} onThanks={() => {
        qc.invalidateQueries({ queryKey: ['product', slug] });
      }} />

      {query.data!.related.length > 0 && (
        <section className="section">
          <SectionTitle eyebrow="Gợi ý" title="Bánh cùng nhà" subtitle="Những vị khách thích bánh này thường chọn thêm" />
          <Stagger className="grid-products">
            {query.data!.related.slice(0, 4).map((rp) => <ProductCard key={rp.id} p={rp} />)}
          </Stagger>
        </section>
      )}

      {/* Thanh mua hàng dính đáy màn hình nhỏ — hiện khi buy box khuất khỏi tầm mắt */}
      <div className={`mobile-buy-bar${!buyVisible && !unavailable ? ' is-show' : ''}`} aria-hidden={buyVisible || unavailable}>
        <div className="mobile-buy-bar__info">
          <span className="mobile-buy-bar__name">{p.name}</span>
          <b className="mobile-buy-bar__price">{formatVND(price)}</b>
        </div>
        <button type="button" className="btn btn-gold" onClick={addOnly} disabled={unavailable || addToCart.isPending} tabIndex={buyVisible || unavailable ? -1 : 0}>
          <Check size={15} /> Thêm vào giỏ
        </button>
      </div>

      {lightbox !== null && lightboxItems.length > 0 && (
        <Lightbox items={lightboxItems} start={lightbox} name={p.name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function ReviewsSection({ slug, productId, initialReviews, logged, userName, onThanks }: {
  slug: string;
  productId: number;
  initialReviews: ProductReviewsDTO;
  logged: boolean;
  userName: string;
  onThanks: () => void;
}) {
  const [page, setPage] = useState(1);
  const [hover, setHover] = useState(0);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [image, setImage] = useState('');

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', slug, page],
    queryFn: () => get<ProductReviewsDTO>(`/products/${encodeURIComponent(slug)}/reviews`, { page, perPage: 5 }),
    initialData: page === 1 ? initialReviews : undefined,
  });

  const writeM = useMutation({
    mutationFn: () => post('/reviews', { productId, rating, comment: comment || undefined, imageUrl: image || undefined }),
    onSuccess: () => {
      toast('Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi tiệm duyệt.', 'ok');
      setComment('');
      setImage('');
      onThanks();
      qc.invalidateQueries({ queryKey: ['product-reviews', slug] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const picked = hover || rating;

  return (
    <Reveal as="section" className="card pad reviews-card" id="danh-gia">
      <div className="reviews-card__head">
        <div>
          <span className="eyebrow">Trạm dừng ngọt</span>
          <h3>Đánh giá của khách</h3>
        </div>
        {reviewsQuery.data && reviewsQuery.data.totalCount > 0 ? (
          <div className="rate-summary">
            <b className="rate-summary__num">{formatRating(reviewsQuery.data.avgRating)}</b>
            <span className="rate-summary__meta">
              <Stars value={reviewsQuery.data.avgRating} size={15} />
              <span className="small muted">{reviewsQuery.data.totalCount} đánh giá</span>
            </span>
          </div>
        ) : (
          <div className="rate-summary rate-summary--empty">
            <Stars value={0} size={15} />
            <span className="small muted">Chưa có đánh giá</span>
          </div>
        )}
      </div>

      {logged ? (
        <form className="review-form" onSubmit={(e) => { e.preventDefault(); writeM.mutate(); }}>
          <div className="review-form__head">
            <span className="eyebrow no-rule">Viết đánh giá của bạn</span>
            <div className="rate-input" onMouseLeave={() => setHover(0)} role="group" aria-label="Chấm sao">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
                  className={`rate-input__star${n <= picked ? ' is-on' : ''}`} aria-label={`Chấm ${n} sao`} aria-pressed={rating === n}>
                  <Star size={22} fill="currentColor" strokeWidth={0} />
                </button>
              ))}
              <span className="rate-input__label small" aria-live="polite">{RATE_LABELS[picked]}</span>
            </div>
          </div>
          <textarea className="textarea" value={comment} rows={3} maxLength={1000}
            aria-label="Cảm nhận của bạn"
            placeholder={`${userName ? userName + ', ' : ''}cảm nhận của bạn về bánh này thế nào?`}
            onChange={(e) => setComment(e.target.value)} />
          <input className="input" placeholder="Link ảnh ổ bánh (không bắt buộc)" value={image} aria-label="Link ảnh (không bắt buộc)" onChange={(e) => setImage(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={writeM.isPending}>
            {writeM.isPending ? 'Đang gửi…' : <>Gửi đánh giá <ArrowRight size={14} className="btn-ico" /></>}
          </button>
        </form>
      ) : (
        <p className="small muted review-signin">
          <Link to="/dang-nhap" className="link-gold">Đăng nhập</Link> để viết đánh giá cho bánh này.
        </p>
      )}

      <div className="review-list">
        {(reviewsQuery.data?.items || []).length === 0 && (
          <p className="review-empty small">
            Chưa có đánh giá nào cho bánh này. Bạn là người đầu tiên chia sẻ cảm nhận nhé!
          </p>
        )}
        {(reviewsQuery.data?.items || []).map((r) => (
          <ReviewCard
            key={r.id}
            author={r.user?.fullName || 'Khách tiệm'}
            rating={r.rating}
            date={formatDate(r.createdAt)}
            dateISO={r.createdAt}
            comment={r.comment}
            imageUrl={r.imageUrl}
            reply={r.reply}
          />
        ))}
      </div>

      {reviewsQuery.data && reviewsQuery.data.meta.totalPages > 1 && (
        <Pagination meta={reviewsQuery.data.meta} page={page} onPage={setPage} scrollTop={false} />
      )}
    </Reveal>
  );
}
