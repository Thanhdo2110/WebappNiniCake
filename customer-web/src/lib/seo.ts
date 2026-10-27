/** SEO: cập nhật title / meta description / canonical từng trang */
import { useEffect } from 'react';

export function useSeo(options: { title: string; description?: string; image?: string | null }) {
  const { title, description, image } = options;
  useEffect(() => {
    const full = `${title} - Nini Cakes`;
    document.title = full;

    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    };

    if (description) {
      setMeta('meta[name="description"]', { name: 'description', content: description });
      setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    }
    setMeta('meta[property="og:title"]', { property: 'og:title', content: full });
    if (image) setMeta('meta[property="og:image"]', { property: 'og:image', content: image });
  }, [title, description, image]);
}
