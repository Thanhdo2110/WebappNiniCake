/** Về Nini Cakes: câu chuyện + giá trị + địa chỉ */
import { useSettings } from '../hooks/catalog';
import { useSeo } from '../lib/seo';
import { imageUrl } from '../lib/placeholder';
import { Link } from 'react-router-dom';
import { Gift, Layers, Timer, Truck } from 'lucide-react';
import { PageIntro, Reveal, Stagger } from '../components/ui';

const VALUES = [
  {
    icon: Layers,
    title: 'Nguyên liệu có tên tuổi',
    text: 'Kem sữa tươi, sô-cô-la cacao nguyên khối và trái cây theo mùa — danh sách minh bạch ngay trên từng loại bánh.',
  },
  {
    icon: Timer,
    title: 'Bánh làm theo ngày đặt',
    text: 'Chúng tôi chỉ làm đúng số phần đã được khách chọn. Nhận đặt trước tối đa 45 ngày cho giỗ và sự kiện.',
  },
  {
    icon: Gift,
    title: 'Gói quà + lời chúc miễn phí',
    text: 'Hộp thiệp, ribbon tơ và lời chúc viết tay được gói kèm như một phần trong bánh.',
  },
  {
    icon: Truck,
    title: 'Giao đúng khung giờ',
    text: 'Đặt khung giờ theo từng giờ một, từ 8h đến 21h, khu vực nội thành và phần khu vực lân cận. Bánh tới vẫn mát và kín gió.',
  },
];

export default function AboutPage() {
  const { data: s } = useSettings();
  useSeo({
    title: 'Về Nini Cakes',
    description: 'Câu chuyện và con người phía sau Nini Cakes — tiệm bánh kem ngà phong cách Á-Âu.',
  });

  return (
    <>
      <section className="about-hero grain">
        <span className="about-hero__pattern pattern-asanoha" aria-hidden />
        <div className="container about-hero__inner">
          <div>
            <Reveal from="soft">
              <span className="eyebrow">Câu chuyện của tiệm</span>
            </Reveal>
            <Reveal from="up" delay={60}>
              <h1 className="about-hero__title">
                Nini bắt đầu từ <em className="foil-text">một cái lò nhỏ</em>
              </h1>
            </Reveal>
            <Reveal from="up" delay={140}>
              <p className="lede">
                Nini Cakes sinh ra từ tình yêu của một cô đầu bếp với bánh sừng bò Âu và mứt trái cây Á.
                Mỗi ngày tiệm làm dưới 100 phần bánh để giữ đúng chất kem ngà, cacao và mùi bơ túi sữa được chọn kỹ càng.
              </p>
            </Reveal>
            <Reveal from="up" delay={210}>
              <div className="about-hero__cta">
                <Link to="/banh" className="btn btn-primary btn-lg">Chọn bánh ngay</Link>
                <Link to="/lien-he" className="btn btn-ghost btn-lg">Nhắn tiệm</Link>
              </div>
            </Reveal>
          </div>
          <Reveal from="scale" className="about-hero__visual ken-burns">
            <img src={imageUrl(null, 'Nini Cakes')} alt="Bếp Nini Cakes" className="img-cover" />
          </Reveal>
        </div>
      </section>

      <PageIntro
        eyebrow="Giá trị"
        title="Bốn điều tiệm giữ mỗi ngày"
        subtitle="Không phải khẩu hiệu — là cách làm được ghi rõ trên từng đơn bánh."
        align="center"
      />

      <div className="container section section--tight">
        <Stagger className="value-grid">
          {VALUES.map((f) => (
            <article key={f.title} className="card pad value-card lift">
              <span className="value-card__icon"><f.icon size={19} /></span>
              <h4>{f.title}</h4>
              <p className="small muted">{f.text}</p>
            </article>
          ))}
        </Stagger>
      </div>

      <section className="container section">
        <Reveal as="div" className="card pad store-card">
          <div className="store-card__col">
            <span className="eyebrow no-rule">Cửa hàng chính</span>
            <h4>{s?.name || 'Nini Cakes'}</h4>
            <p className="small muted">{s?.address}</p>
            <p className="small muted">{s?.openingHours}</p>
          </div>
          <div className="store-card__col">
            <span className="eyebrow no-rule">Liên hệ nhanh</span>
            <p className="small muted">
              <a href={`tel:${s?.phone}`} className="link-gold">{s?.phone}</a>
              <br />
              <a href={`mailto:${s?.email}`} className="link-gold">{s?.email}</a>
            </p>
          </div>
          <div className="store-card__cta">
            <Link to="/banh" className="btn btn-gold btn-lg">Xem thực đơn</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
