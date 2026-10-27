/** Khối UI dùng xuyên suốt storefront: reveal, sao, tiêu đề đề mục, trạng thái */
import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { useInView } from '../hooks/motion';

type RevealFrom = 'up' | 'soft' | 'left' | 'right' | 'scale' | 'blur';

/** Hiện dần khi cuộn tới. `delay` (ms) để xếp lớp, `when` để tắt với khối đã có hiệu ứng riêng. */
export function Reveal({
  children,
  className = '',
  from = 'up',
  delay = 0,
  style,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  from?: RevealFrom;
  delay?: number;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'aside' | 'article' | 'li';
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const mod = from === 'up' ? '' : `reveal--${from}`;
  const cls = `reveal${mod ? ` ${mod}` : ''}${inView ? ' in-view' : ''}${className ? ` ${className}` : ''}`;
  const withDelay = delay ? ({ '--d': `${delay}ms`, ...style } as CSSProperties) : style;
  if (as === 'li') return <li ref={ref as React.Ref<HTMLLIElement>} className={cls} style={withDelay}>{children}</li>;
  if (as === 'aside') return <aside ref={ref as React.Ref<HTMLElement>} className={cls} style={withDelay}>{children}</aside>;
  if (as === 'article') return <article ref={ref as React.Ref<HTMLElement>} className={cls} style={withDelay}>{children}</article>;
  if (as === 'section') return <section ref={ref as React.Ref<HTMLElement>} className={cls} style={withDelay}>{children}</section>;
  return <div ref={ref} className={cls} style={withDelay}>{children}</div>;
}

/** Con giống: các con chạy vào lần lượt theo thứ tự DOM. */
export function Stagger({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`stagger${inView ? ' in-view' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value * 2) / 2;
  const pct = Math.max(0, Math.min(100, (rounded / 5) * 100));
  return (
    <span
      className="stars"
      style={{ '--p': `${pct}%`, fontSize: `${size}px` } as CSSProperties}
      aria-label={`Đánh giá ${rounded}/5`}
    >
      <span aria-hidden>★★★★★</span>
    </span>
  );
}

/** Đề mục section: nhãn dẫn + tên lớn + mô tả, có thể kèm nút bên phải. */
export function SectionTitle({
  title,
  subtitle,
  eyebrow,
  center = false,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  center?: boolean;
  action?: ReactNode;
}) {
  return (
    <Reveal className={`section-head${center ? ' section-head--center' : ''}`}>
      <div className="section-head__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        <span className="section-head__rule" aria-hidden />
      </div>
      {action && <div className="section-head__action">{action}</div>}
    </Reveal>
  );
}

/** Đầu trang nội bộ: breadcrumb + nhãn + tên + mô tả. */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  crumbs,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  crumbs?: Array<{ label: string; to?: string }>;
  align?: 'left' | 'center';
}) {
  return (
    <header className={`page-intro${align === 'center' ? ' page-intro--center' : ''}`}>
      <div className="container">
        {crumbs && <Breadcrumb items={crumbs} />}
        {eyebrow && <Reveal as="div"><span className="eyebrow">{eyebrow}</span></Reveal>}
        <Reveal from="soft">
          <h1 className="page-intro__title">{title}</h1>
        </Reveal>
        {subtitle && (
          <Reveal from="soft" delay={90}>
            <p className="lede page-intro__sub">{subtitle}</p>
          </Reveal>
        )}
      </div>
    </header>
  );
}

export function LoadingBlock({ text = 'Đang chuẩn bị...' }: { text?: string }) {
  return (
    <div className="loading-block">
      <div className="spinner" />
      <div className="small muted">{text}</div>
    </div>
  );
}

/** Bộ khung xương cho lưới sản phẩm khi chờ dữ liệu. */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid-products" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card sk-card">
          <div className="skeleton sk-card__media" />
          <div className="sk-card__body">
            <div className="skeleton" style={{ height: 11, width: '38%' }} />
            <div className="skeleton" style={{ height: 15, width: '82%', marginTop: 10 }} />
            <div className="skeleton" style={{ height: 11, width: '62%', marginTop: 10 }} />
            <div className="skeleton" style={{ height: 20, width: '44%', marginTop: 16 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = '🍰', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <Reveal className="card empty-state" from="scale">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </Reveal>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="breadcrumb small" aria-label="Đường dẫn">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="breadcrumb__item">
          {i > 0 && <span className="breadcrumb__sep" aria-hidden>›</span>}
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span className="breadcrumb__current">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function StatusPill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="pill-status" style={{ '--c': color } as CSSProperties}>
      <i aria-hidden />
      {children}
    </span>
  );
}
