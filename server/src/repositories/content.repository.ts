import { prisma } from '../config/prisma.js';

export const contentRepository = {
  /* ---- Banners ---- */
  activeBanners: () =>
    prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  allBanners: () => prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  getBanner: (id: number) => prisma.banner.findUnique({ where: { id } }),
  createBanner: (data: { title: string; subtitle?: string | null; imageUrl?: string | null; linkUrl?: string | null; sortOrder: number; isActive: boolean }) =>
    prisma.banner.create({ data }),
  updateBanner: (id: number, data: Record<string, unknown>) => prisma.banner.update({ where: { id }, data }),
  deleteBanner: (id: number) => prisma.banner.delete({ where: { id } }),

  /* ---- Posts ---- */
  listPosts: (type?: string, publishedOnly?: boolean) =>
    prisma.post.findMany({
      where: {
        ...(type ? { type: type.toUpperCase() as 'STORY' | 'POLICY' | 'FAQ' } : {}),
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: { id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, type: true, isPublished: true, publishedAt: true, createdAt: true },
    }),
  latestStory: () =>
    prisma.post.findFirst({
      where: { type: 'STORY', isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true, excerpt: true, coverImageUrl: true },
    }),
  getBySlug: (slug: string) =>
    prisma.post.findUnique({ where: { slug } }),
  createPost: (data: { slug: string; title: string; excerpt?: string | null; content: string; coverImageUrl?: string | null; type: string; isPublished: boolean }) =>
    prisma.post.create({
      data: {
        ...data,
        type: data.type as 'STORY' | 'POLICY' | 'FAQ',
        publishedAt: data.isPublished ? new Date() : null,
      },
    }),
  updatePost: (id: number, data: Record<string, unknown>) => prisma.post.update({ where: { id }, data }),
  deletePost: (id: number) => prisma.post.delete({ where: { id } }),

  /* ---- Store settings (singleton row id=1) ---- */
  getSettings: () => prisma.storeSetting.findUnique({ where: { id: 1 } }),
  ensureSettings: async () => {
    const s = await prisma.storeSetting.findUnique({ where: { id: 1 } });
    if (s) return s;
    return prisma.storeSetting.create({ data: { id: 1 } });
  },
  updateSettings: (data: Record<string, unknown>) => prisma.storeSetting.update({ where: { id: 1 }, data }),

  /* ---- Messages / Newsletter ---- */
  createMessage: (data: { name: string; email: string; phone?: string | null; subject?: string | null; content: string }) =>
    prisma.message.create({ data }),
  listMessages: (page: number, perPage: number) =>
    prisma.$transaction([
      prisma.message.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      prisma.message.count(),
    ]),
  markMessageRead: (id: number) => prisma.message.update({ where: { id }, data: { isRead: true } }),
  subscribe: (email: string) => prisma.subscriber.upsert({ where: { email }, update: { isActive: true }, create: { email } }),
  unsubscribed: (email: string) => prisma.subscriber.update({ where: { email }, data: { isActive: false } }),
  listSubscribers: () => prisma.subscriber.findMany({ where: { isActive: true }, orderBy: { subscribedAt: 'desc' } }),

  /* ---- Admin khống chế nội dung khuyến mãi hiển thị ở trang chủ ---- */
  countSubscribers: () => prisma.subscriber.count({ where: { isActive: true } }),
  countUnreadMessages: () => prisma.message.count({ where: { isRead: false } }),
};
