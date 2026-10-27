import { prisma } from '../config/prisma.js';

const SITE_BASE = process.env.PUBLIC_SITE_URL || 'https://ninicakes.vn';
const STATIC_PATHS = ['/', '/banh', '/ve-nini', '/lien-he', '/cau-hoi', '/chinh-sach'];

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** sitemap.xml động: trang tĩnh + sản phẩm + bài viết đã đăng */
export async function buildSitemap(): Promise<string> {
  const [products, posts] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.post.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: `${SITE_BASE}${p}`, lastmod: null as string | null, priority: p === '/' ? '1.0' : '0.6' })),
    ...products.map((p) => ({ loc: `${SITE_BASE}/san-pham/${p.slug}`, lastmod: p.updatedAt.toISOString().slice(0, 10), priority: '0.8' })),
    ...posts.map((p) => ({ loc: `${SITE_BASE}/bai-viet/${p.slug}`, lastmod: p.updatedAt.toISOString().slice(0, 10), priority: '0.5' })),
  ];

  const body = urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}
