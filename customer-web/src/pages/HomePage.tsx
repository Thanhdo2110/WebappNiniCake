/** Trang chủ: hero có chiều sâu, dải cam kết, bộ sưu tập, danh mục, các ray bánh và đánh giá */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Gift, MapPin, Phone, Quote, RotateCcw, Sparkles, Truck } from 'lucide-react';
import { useHome } from '../hooks/catalog';
import { isSafeInternalPath } from '@shared';
import { CardSkeleton, EmptyState, Reveal, SectionTitle, Stagger, Stars } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { usePointerParallax, prefersReducedMotion } from '../hooks/motion';
import { useSeo } from '../lib/seo';
import { imageUrl, imgFallback } from '../lib/placeholder';
import { formatDate, formatVND } from '../lib/format';
import { getRecentlyViewed } from '../lib/recent';

const SERVICES = [
  { icon: Sparkles, title: 'Kem tươi mỗi sáng', text: 'Đánh tay từng mẻ nhỏ, không phẩm màu' },
  { icon: Truck, title: 'Giao đúng khung giờ', text: 'Sáu khung giờ mỗi ngày, đóng gói giữ mát' },
  { icon: Gift, title: 'Gói quà tinh tế', text: 'Thiệp viết tay & ribbon miễn phí' },
];

export default function HomePage() {
  const { data: home, isLoading, isError, refetch } = useHome();
  const heroRef = usePointerParallax<HTMLDivElement>();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [recent, setRecent] = useState(() => getRecentlyViewed());
  const touchX = useRef<number | null>(null);
  const bannerCount = home?.banners.length ?? 0;

  useSeo({
    title: 'Tiệm bánh kem ngà phong cách Á-Âu',
    description: 'Nini Cakes làm bánh kem nhẹ theo phong cách Á-Âu mỗi ngày: bánh sinh nhật, bánh cưới, bánh tiệc. Đặt trước, nhận đúng khung giờ bạn chọn.',
  });

  useEffect(() => {
    if (bannerCount < 2 || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setSlide((n) => (n + 1) % bannerCount), 6000);
    return () => window.clearInterval(timer);
  }, [bannerCount, paused]);

  /* Đọc lại "đã xem gần đây" mỗi lần quay về trang chủ */
  useEffect(() => setRecent(getRecentlyViewed()), []);

  if (isLoading || (!home && !isError)) {
    return (
      <div className="container section">
        <SectionTitle eyebrow="Đang mở lò" title="Chúng tôi đang xếp bánh lên kệ…" />
        <CardSkeleton count={4} />
      </div>
    );
  }

  if (isError || !home) {
    return (
      <div className="container section">
        <EmptyState icon="🫖" title="Chưa kết nối được với tiệm">
          <p className="muted small">Có vẻ đường truyền đang trục trặc. Bạn thử tải lại dữ liệu nhé.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => refetch()}>
            <RotateCcw size={15} /> Thử lại
          </button>
        </EmptyState>
      </div>
    );
  }

  const banners = home.banners;
  const active = Math.min(slide, Math.max(0, banners.length - 1));
  const heroProduct = home.featured[0] ?? home.bestsellers[0] ?? null;
  const s = home.settings;

  const step = (dir: 1 | -1) => setSlide((n) => (n + dir + banners.length) % banners.length);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) > 44) step(delta < 0 ? 1 : -1);
  };

  return (
    <>
      {/* 1. Hero — câu chuyện thương hiệu */}
      <section className="hero grain">
        <div className="ambient" aria-hidden>
          <span className="blob" style={{ width: 280, height: 280, top: '8%', left: '3%', background: 'radial-gradient(circle, rgba(238,220,188,.8), transparent 70%)' }} />
          <span className="blob" style={{ width: 320, height: 320, bottom: '2%', right: '8%', background: 'radial-gradient(circle, rgba(248,232,232,.85), transparent 70%)', animationDelay: '2s' }} />
          <span className="blob" style={{ width: 200, height: 200, top: '34%', right: '44%', background: 'radial-gradient(circle, rgba(234,240,231,.85), transparent 70%)', animationDelay: '4s' }} />
        </div>

        <div className="container hero__inner" ref={heroRef}>
          <div>
            <Reveal from="soft">
              <span className="eyebrow">Kem ngà · Cacao · Champagne</span>
            </Reveal>
            <Reveal from="up" delay={60}>
              <h1 className="hero__title">
                Bánh ngọt <em className="foil-text">nhẹ như mây</em>
                <br />
                cho mỗi dịp đặc biệt
              </h1>
            </Reveal>
            <Reveal from="up" delay={140}>
              <p className="lede hero__lead">
                Nini Cakes đánh kem mỗi sáng với kem tươi, sô-cô-la cacao và trái cây theo mùa.
                Chọn bánh, dặn lời chúc, chọn khung giờ — phần còn lại chúng tôi lo.
              </p>
            </Reveal>
            <Reveal from="up" delay={220}>
              <div className="hero__actions">
                <Link to="/banh" className="btn btn-primary btn-lg">
                  Chọn bánh ngay <ArrowRight size={16} className="btn-ico" />
                </Link>
                <Link to="/ve-nini" className="btn btn-ghost btn-lg">
                  Về Nini Cakes
                </Link>
              </div>
            </Reveal>
            <Reveal from="up" delay={300}>
              <div className="hero__meta">
                <span>
                  <Phone size={14} /> {s.phone}
                </span>
                <span>
                  <Clock size={14} /> {s.openingHours}
                </span>
                {s.address && (
                  <span>
                    <MapPin size={14} /> {s.address}
                  </span>
                )}
              </div>
            </Reveal>
          </div>

          <Reveal from="scale" className="hero__visual">
            <span className="hero__plate pattern-asanoha" aria-hidden />
            <div className="hero__card ken-burns">
              <img
                src={imageUrl(heroProduct?.imageUrl, 'Bánh kem Nini Cakes')}
                onError={imgFallback('Bánh kem Nini Cakes')}
                alt="Bánh kem Nini Cakes"
                className="img-cover"
              />
            </div>
            <div className="hero__seal">
              <b>Á – Âu</b>
              <span>thủ công mỗi ngày</span>
            </div>
            {heroProduct && (
              <Link to={`/san-pham/${heroProduct.slug}`} className="hero__tag">
                <span className="hero__tag-label">Món của tuần</span>
                <b>{heroProduct.name}</b>
                <span className="hero__tag-price">
                  {formatVND(heroProduct.price)} <ArrowRight size={14} />
                </span>
              </Link>
            )}
          </Reveal>
        </div>
      </section>

      {/* 2. Dải cam kết — nổi nhẹ trên nền hero */}
      <section className="container service-strip" aria-label="Cam kết của tiệm">
        {SERVICES.map(({ icon: Icon, title, text }) => (
          <div className="service-card" key={title}>
            <span className="service-card__icon"><Icon size={19} /></span>
            <div>
              <b>{title}</b>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Ribbon chạy */}
      <section className="ribbon" aria-hidden>
        <div className="ribbon__track">
          {[0, 1].map((dup) => (
            <div className="ribbon__set" key={dup}>
              <span className="ribbon__item">{s.slogan || 'Hương Á – Âu trong từng chiếc bánh'}</span>
              <span className="ribbon__dot">✦</span>
              <span className="ribbon__item">Kem tươi đánh tay</span>
              <span className="ribbon__dot">✦</span>
              <span className="ribbon__item">Cacao nhập khẩu</span>
              <span className="ribbon__dot">✦</span>
              {s.freeShippingMinVnd > 0 && (
                <>
                  <span className="ribbon__item">
                    Miễn phí giao từ {formatVND(s.freeShippingMinVnd)}
                  </span>
                  <span className="ribbon__dot">✦</span>
                </>
              )}
              <span className="ribbon__item">{s.openingHours}</span>
              <span className="ribbon__dot">✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Bộ sưu tập / banner */}
      {banners.length > 0 && (
        <section className="container section section--flush-top">
          <SectionTitle
            eyebrow="Bộ sưu tập"
            title="Câu chuyện mùa này"
            subtitle="Chiến dịch và ưu đãi mới nhất từ tiệm"
            action={
              <Link to="/banh" className="btn btn-soft btn-sm">
                Xem thực đơn <ArrowRight size={14} className="btn-ico" />
              </Link>
            }
          />
          <Reveal from="scale" className="banner">
            <div
              className="banner__stage"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              aria-live={paused || prefersReducedMotion() ? 'polite' : 'off'}
            >
              {banners.map((b, i) => (
                <div key={b.id} className={`banner__slide${i === active ? ' is-active' : ''}`}>
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt={b.title} />
                  ) : (
                    <div className="banner__fallback" aria-hidden />
                  )}
                  <span className="banner__scrim" />
                  <div className="banner__content">
                    <span className="eyebrow">Nini Cakes</span>
                    <h2 style={{ marginTop: 8 }}>{b.title}</h2>
                    {b.subtitle && <p>{b.subtitle}</p>}
                    {b.linkUrl && (
                      <Link
                        to={isSafeInternalPath(b.linkUrl) ? b.linkUrl : '/banh'}
                        className="btn btn-gold"
                        style={{ marginTop: 16 }}
                      >
                        Xem ngay <ArrowRight size={15} className="btn-ico" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {banners.length > 1 && (
                <>
                  <button
                    type="button"
                    className="banner__arrow banner__arrow--prev"
                    onClick={() => step(-1)}
                    aria-label="Banner trước"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="banner__arrow banner__arrow--next"
                    onClick={() => step(1)}
                    aria-label="Banner kế tiếp"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="banner__nav">
                    {banners.map((b, i) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`banner__dot${i === active ? ' is-active' : ''}`}
                        onClick={() => setSlide(i)}
                        aria-label={`Xem banner ${i + 1}`}
                        aria-current={i === active}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* 5. Danh mục */}
      <section className="container section" id="thuc-don">
        <SectionTitle
          eyebrow="Danh mục"
          title="Chọn theo dịp"
          subtitle="Sinh nhật, cưới, sự kiện — hay chỉ một chiều trà nhẹ"
          center
        />
        <Stagger className="cat-strip">
          {home.categories.map((c) => (
            <Link key={c.id} to={`/banh?category=${c.slug}`} className="cat-chip">
              {c.name}
              <span className="cat-chip__n">{c.productCount}</span>
            </Link>
          ))}
        </Stagger>
      </section>

      {home.featured.length > 0 && (
        <section className="container section section--tint">
          <SectionTitle
            eyebrow="Tuần này"
            title="Bánh nổi bật"
            subtitle="Được khách đặt nhiều và nhận khen nhất"
            action={
              <Link to="/banh?featured=true" className="btn btn-soft btn-sm">
                Xem tất cả <ArrowRight size={14} className="btn-ico" />
              </Link>
            }
          />
          <Stagger className="grid-products">
            {home.featured.slice(0, 4).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </Stagger>
        </section>
      )}

      {home.seasonal.length > 0 && (
        <section className="container section">
          <SectionTitle
            eyebrow="Theo mùa"
            title="Vị mới mỗi mùa"
            subtitle="Nguyên liệu tươi theo mùa — số lượng có hạn"
            action={
              <Link to="/banh?seasonal=true" className="btn btn-soft btn-sm">
                Xem tất cả <ArrowRight size={14} className="btn-ico" />
              </Link>
            }
          />
          <Stagger className="grid-products">
            {home.seasonal.slice(0, 4).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </Stagger>
        </section>
      )}

      {home.bestsellers.length > 0 && (
        <section className="container section section--scrim">
          <SectionTitle
            eyebrow="Bán chạy"
            title="Khách quay lại nhiều nhất"
            subtitle="Xếp theo số phần bánh đã bán"
            action={
              <Link to="/banh?sort=popular" className="btn btn-soft btn-sm">
                Xem tất cả <ArrowRight size={14} className="btn-ico" />
              </Link>
            }
          />
          <Stagger className="grid-products grid-products--wide">
            {home.bestsellers.slice(0, 8).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </Stagger>
        </section>
      )}

      {recent.length > 0 && (
        <section className="container section">
          <SectionTitle
            eyebrow="Dành riêng cho bạn"
            title="Đã xem gần đây"
            subtitle="Những chiếc bánh bạn vừa ghé qua — tìm lại ngay kẻo lỡ"
            action={
              <Link to="/banh" className="btn btn-soft btn-sm">
                Xem thực đơn <ArrowRight size={14} className="btn-ico" />
              </Link>
            }
          />
          <Stagger className="grid-products">
            {recent.slice(0, 4).map((p) => (
              <ProductCard key={`recent-${p.id}`} p={p} />
            ))}
          </Stagger>
        </section>
      )}

      {home.topReviews.length > 0 && (
        <section className="container section">
          <SectionTitle eyebrow="Trạm dừng ngọt" title="Khách đã nói gì" subtitle="Những đánh giá mới nhất được tiệm duyệt" center />
          <div className="review-marquee">
            <Stagger className="grid-products grid-products--wide">
              {home.topReviews.slice(0, 3).map((r) => (
                <figure key={r.id} className="card quote">
                  <Quote size={22} aria-hidden className="quote__mark" />
                  <Stars value={r.rating} size={15} />
                  <blockquote>{r.comment || 'Bánh rất ngon, khách dùng lại nhiều lần.'}</blockquote>
                  <figcaption className="small muted">
                    {r.product && (
                      <Link to={`/san-pham/${r.product.slug}`} className="quote__link">
                        {r.product.name}
                      </Link>
                    )}
                    {r.product && ' · '}
                    {r.user.fullName} · {formatDate(r.createdAt)}
                  </figcaption>
                </figure>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {home.categories.length === 0 && (
        <section className="container section">
          <EmptyState title="Tiệm chưa mở danh mục">Chúng tôi đang hoàn thiện thực đơn, vui lòng quay lại sau ít giờ.</EmptyState>
        </section>
      )}
    </>
  );
}
