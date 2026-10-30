/** Hooks motion tự viết, không dependency: reveal, tilt 3D, parallax, progress. */
import { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Bắn class .in-view khi phần tử đi vào màn hình (mặc định chỉ kích hoạt 1 lần). */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px', once = true) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) { io.unobserve(entry.target); stopNet(); }
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold: 0.1 },
    );
    /* Nội dung không được phép vô hình vĩnh viễn chỉ vì observer không báo về —
       .reveal/.stagger khởi đầu ở opacity:0, nên IntersectionObserver hỏng trên
       WebView cũ hay chế độ tiết kiệm pin là mất cả khu sản phẩm. Bám theo cuộn
       và tự hiện khi phần tử thực sự nằm trong khung nhìn. */
    const stopNet = () => {
      window.clearInterval(poll);
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        setInView(true);
        if (once) stopNet();
      }
    };
    const poll = window.setInterval(onScroll, 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    io.observe(el);
    return () => { io.disconnect(); stopNet(); };
  }, [rootMargin, once]);

  return { ref, inView };
}

/** Nghiêng thẻ theo con trỏ: cấp --rx/--ry cho CSS 3D, --mx/--my cho vệt sáng. */
export function useTilt<T extends HTMLElement>(max = 7, scale = 1.015) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;

    const reset = () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
      /* --lift được nạp vào scale() của .tilt, nên giá trị trung tính là 1 chứ không phải 0.
         Để 0 thì thẻ co lại thành 0x0 — cảm ứng không có pointermove nên không bao giờ
         phục hồi, và trên điện thoại toàn bộ lưới sản phẩm biến mất dù DOM vẫn còn. */
      el.style.setProperty('--lift', '1');
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--ry', `${(x - 0.5) * 2 * max}deg`);
        el.style.setProperty('--rx', `${(0.5 - y) * 2 * max}deg`);
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        el.style.setProperty('--lift', String(scale));
      });
    };

    reset();
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('pointercancel', reset);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', reset);
      el.removeEventListener('pointercancel', reset);
    };
  }, [max, scale]);

  return ref;
}

/** --px/--py trong khoảng -1..1 theo con trỏ, lớp nền dịch chuyển tạo chiều sâu. */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', '0');
        el.style.setProperty('--py', '0');
      });
    };

    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return ref;
}

/** 0..1 theo chiều cuộn của trang, dùng cho thanh tiến trình đầu trang. */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return progress;
}

export function useScrolled(threshold = 24): boolean {
  const [isPast, setIsPast] = useState(false);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      setIsPast(window.scrollY > threshold);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold]);
  return isPast;
}

/** Số chạy nhẹ cho khối thống kê: gắn ref vào phần tử cần theo dõi. */
export function useCountUp<T extends HTMLElement = HTMLSpanElement>(target: number, duration = 900) {
  const ref = useRef<T | null>(null);
  const started = useRef(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
    started.current = false;
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setValue(target);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / duration);
          setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return { ref, value };
}
