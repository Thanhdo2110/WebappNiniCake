/** Chi tiết bánh: bộ sưu tập 3D, biến thể, lời chúc, ảnh tham khảo, giỏ + đánh giá + bánh liên quan */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Check, Minus, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import type { IngredientDTO, ProductDetailPageDTO, ProductReviewsDTO } from '@shared/types';
import { MAX_CART_QUANTITY } from '@shared';
import { formatVND, formatDate, formatRating } from '../lib/format';
import { imageUrl } from '../lib/placeholder';
import { get, post, errMessage, uploadFile } from '../lib/api';
import { LoadingBlock, EmptyState, Stars, Breadcrumb, Reveal, SectionTitle, Stagger } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { ReviewCard } from '../components/ReviewCard';
import { Pagination } from '../components/Pagination';
import { useAddToCart } from '../hooks/cart';
import { useAuth } from '../hooks/auth';
import { useToast } from '../hooks/toast';
import { useTilt } from '../hooks/motion';
import { useSeo } from '../lib/seo';

const RATE_LABELS = ['', 'Rất tệ', 'Chưa ổn', 'Bình thường', 'Khá hài lòng', 'Rất tốt'];

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
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const customOptions = {
    messageOnCake: message.trim() || undefined,
    notes: notes.trim() || undefined,
    referenceImageUrl: refImage || undefined,
  };

  const pickRefImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setRefImage(url);
      toast('Đã đính kèm ảnh tham khảo cho bánh.', 'ok');
    } catch (e) {
      toast(errMessage(e), 'err');
    } finally {
      setUploading(false);
    }
  };

  useSeo({
    title: p?.name || 'Đang tải bánh...',
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
    : p.variants.find((v) => v.isActive && v.stock > 0) || p.variants.find((v) => v.isActive) || p.variants[0]);

  const buyNow = async () => {
    if (!currentVariant) return;
    try {
      await addToCart.mutateAsync({
        variantId: currentVariant.id, quantity: qty,
        options: customOptions,
      });
      navigate('/gio-hang');
    } catch (e) {
      toast(errMessage(e), 'err');
    }
  };

  const addOnly = async () => {
    if (!currentVariant) return;
    try {
      await addToCart.mutateAsync({
        variantId: currentVariant.id, quantity: qty,
        options: customOptions,
      });
      toast('Đã thêm bánh vào giỏ.', 'ok');
    } catch (e) {
      toast(errMessage(e), 'err');
    }
  };

  if (query.isLoading) return <LoadingBlock text="Tiệm đang bày bánh cho bạn xem..." />;
  if (query.isError || !p) {
    return (
      <div className="container section">
        <EmptyState icon="🫤" title="Không tìm thấy bánh này">
          <Link to="/banh" className="btn btn-primary btn-sm">Về danh sách bánh</Link>
        </EmptyState>
      </div>
    );
  }

  const images = p.images.filter((i) => i.url);
  const shown = images[Math.min(shot, Math.max(0, images.length - 1))];
  const stock = currentVariant?.stock ?? 0;
  const soldOut = stock <= 0;
  const price = currentVariant?.price ?? p.price;
  const onSale = p.compareAtPrice !== null && p.compareAtPrice > price;

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
            <div ref={galleryTilt} className="tilt detail-gallery__stage img-frame">
              <div className="tilt-glare" />
              <img
                key={shown?.id ?? p.id}
                src={imageUrl(shown?.url ?? p.imageUrl, p.name)}
                alt={shown?.alt || p.name}
                className="detail-gallery__main"
              />
              {p.isFeatured && <span className="detail-gallery__flag tag tag-gold">Bánh nổi bật</span>}
            </div>
          </div>
          {images.length > 1 && (
            <div className="detail-thumbs">
              {images.slice(0, 6).map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  className={`detail-thumb${i === Math.min(shot, images.length - 1) ? ' is-active' : ''}`}
                  onClick={() => setShot(i)}
                  aria-label={`Xem ảnh ${i + 1} của ${p.name}`}
                  aria-current={i === shot}
                >
                  <img src={imageUrl(im.url, p.name)} alt="" loading="lazy" />
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
              <span className="small muted">
                {p.ratingCount > 0
                  ? `${p.ratingCount} đánh giá • ${formatRating(p.ratingAvg)}/5`
                  : 'Mới có, chờ bạn là người đầu tiên đánh giá'}
              </span>
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
                <span className="pick-block__label">Chọn kích cỡ / vị</span>
                <div className="pill-row">
                  {p.variants.filter((v) => v.isActive).map((v) => (
                    <button key={v.id}
                      type="button"
                      className={`pill-select${currentVariant?.id === v.id ? ' is-selected' : ''}`}
                      disabled={v.stock <= 0}
                      onClick={() => setVariantId(v.id)}
                      title={v.stock <= 0 ? 'Tạm hết phần này' : `Kho còn ${v.stock} phần`}>
                      <span className="pill-select__name">{v.name}{v.flavor ? ` – ${v.flavor}` : ''}</span>
                      <span className="pill-select__price">{formatVND(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {currentVariant && (
            soldOut
              ? <div className="error-box pick-note">Phần bánh này <b>tạm hết</b> nên chưa thể thêm vào giỏ. Bạn chọn kích cỡ/vị khác còn hàng, hoặc gọi hotline để tiệm làm riêng theo ngày bạn cần.</div>
              : <p className="small muted pick-note">Kho còn {stock} phần sẵn sàng cho ngày của bạn.</p>
          )}

          <Reveal from="up" delay={80}>
            <div className="card pad detail-buy">
              <div className="field">
                <label>Lời chúc trên bánh (tối đa 60 ký tự)</label>
                <input className="input" value={message} maxLength={60} placeholder="VD: Chúc mừng sinh nhật Mẹ!" onChange={(e) => setMessage(e.target.value)} />
                <div className="char-left small faint">{message.length}/60</div>
              </div>
              <div className="field">
                <label>Ghi chú riêng cho tiệm</label>
                <textarea className="textarea" value={notes} maxLength={500} rows={2} placeholder="VD: Ít ngọt, trang trí hoa latte..." onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Ảnh tham khảo mẫu bánh (tùy chọn)</label>
                {refImage ? (
                  <div className="ref-row">
                    <img src={refImage} alt="Ảnh tham khảo bạn vừa tải" className="ref-row__img" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefImage(null)}>
                      <Trash2 size={14} /> Bỏ ảnh
                    </button>
                  </div>
                ) : logged ? (
                  <label className="file-drop">
                    <input type="file" accept="image/*" disabled={uploading}
                      onChange={(e) => { void pickRefImage(e.target.files?.[0]); e.target.value = ''; }} />
                    <span className="file-drop__label">
                      <Sparkles size={15} /> {uploading ? 'Đang tải ảnh lên…' : 'Chọn ảnh từ máy'}
                    </span>
                  </label>
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>
                    <Link to="/dang-nhap" className="link-gold">Đăng nhập</Link> để đính ảnh tham khảo cho tiệm làm theo.
                  </p>
                )}
              </div>

              <div className="buy-row">
                <div className="qty-stepper">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Trừ đi"><Minus size={15} /></button>
                  <output aria-label="Số phần">{qty}</output>
                  <button type="button" onClick={() => setQty(Math.min(MAX_CART_QUANTITY, Math.min(qty + 1, soldOut ? qty : stock || 1)))} aria-label="Cộng thêm"><Plus size={15} /></button>
                </div>
                <button type="button" className="btn btn-gold btn-lg" onClick={addOnly} disabled={soldOut || addToCart.isPending}>
                  <Check size={16} /> {soldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                </button>
                <button type="button" className="btn btn-primary btn-lg" onClick={buyNow} disabled={soldOut || addToCart.isPending}>
                  {soldOut ? 'Không đặt được' : 'Mua ngay'} <ArrowRight size={16} className="btn-ico" />
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal from="up" delay={120}>
            <div className="detail-facts">
              {p.ingredients.length > 0 && (
                <div className="fact-row">
                  <span className="fact-row__label eyebrow no-rule">Thành phần chính</span>
                  <div className="fact-row__tags">
                    {p.ingredients.map((id) => (
                      <span key={id} className="tag">{ingredientsQ.data?.find((i) => i.id === id)?.name || `#${id}`}</span>
                    ))}
                  </div>
                </div>
              )}
              {p.allergens.length > 0 && (
                <p className="allergen-note small">
                  <AlertTriangle size={15} />
                  <span>
                    Bánh chứa dị ứng cần lưu ý. Xem danh sách dị ứng của bánh này ở bộ lọc “Bỏ qua dị ứng” trên trang danh sách bánh.
                  </span>
                </p>
              )}
            </div>
          </Reveal>
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
    <Reveal as="section" className="card pad reviews-card">
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
            <div className="rate-input" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
                  className={`rate-input__star${n <= picked ? ' is-on' : ''}`} aria-label={`Chấm ${n} sao`}>
                  <Star size={22} fill="currentColor" strokeWidth={0} />
                </button>
              ))}
              <span className="rate-input__label small">{RATE_LABELS[picked]}</span>
            </div>
          </div>
          <textarea className="textarea" value={comment} rows={3} maxLength={1000}
            placeholder={`${userName ? userName + ', ' : ''}cảm nhận của bạn về bánh này thế nào?`}
            onChange={(e) => setComment(e.target.value)} />
          <input className="input" placeholder="Link ảnh ổ bánh (không bắt buộc)" value={image} onChange={(e) => setImage(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={writeM.isPending}>
            Gửi đánh giá <ArrowRight size={14} className="btn-ico" />
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
            comment={r.comment}
            imageUrl={r.imageUrl}
            reply={r.reply}
          />
        ))}
      </div>

      {reviewsQuery.data && reviewsQuery.data.meta.totalPages > 1 && (
        <Pagination meta={reviewsQuery.data.meta} page={page} onPage={setPage} />
      )}
    </Reveal>
  );
}
