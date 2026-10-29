import { contentRepository as repo } from '../repositories/content.repository.js';
import { prisma } from '../config/prisma.js';
import { fail } from '../utils/http.js';
import { ensureUniqueSlug } from '../utils/slug.js';
import { buildMeta } from '../utils/pagination.js';
import { settingsToDTO } from '../utils/dto.js';
import type { Prisma } from '@prisma/client';

export const contentService = {
  /* ---- Banners ---- */
  activeBanners: () => repo.activeBanners(),
  allBanners: () => repo.allBanners(),
  async createBanner(input: { title: string; subtitle?: string; imageUrl?: string; linkUrl?: string; sortOrder: number; isActive: boolean }) {
    return repo.createBanner({
      title: input.title,
      subtitle: input.subtitle || null,
      imageUrl: input.imageUrl || null,
      linkUrl: input.linkUrl || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });
  },
  async updateBanner(id: number, input: Partial<{ title: string; subtitle?: string; imageUrl?: string; linkUrl?: string; sortOrder: number; isActive: boolean }>) {
    const banner = await repo.getBanner(id);
    if (!banner) throw fail('Banner không tồn tại.', 404);
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'sortOrder', 'isActive'] as const) {
      if (input[k] !== undefined) data[k] = input[k];
    }
    if (input.subtitle !== undefined) data.subtitle = input.subtitle || null;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;
    if (input.linkUrl !== undefined) data.linkUrl = input.linkUrl || null;
    return repo.updateBanner(id, data);
  },
  async deleteBanner(id: number) {
    const banner = await repo.getBanner(id);
    if (!banner) throw fail('Banner không tồn tại.', 404);
    await repo.deleteBanner(id);
    return { id };
  },

  /* ---- Posts ---- */
  listPosts: (type?: string, publishedOnly = true) => repo.listPosts(type, publishedOnly),
  async getPostBySlug(slug: string) {
    const post = await repo.getBySlug(slug);
    if (!post || !post.isPublished) throw fail('Bài viết không tồn tại.', 404);
    return post;
  },
  async createPost(input: { title: string; slug?: string; excerpt?: string; content: string; coverImageUrl?: string; type: string; isPublished: boolean }) {
    const slug = await ensureUniqueSlug(input.slug || input.title, async (s) => !!(await repo.getBySlug(s)));
    const created = await repo.createPost({
      slug,
      title: input.title,
      excerpt: input.excerpt || null,
      content: input.content,
      coverImageUrl: input.coverImageUrl || null,
      type: input.type,
      isPublished: input.isPublished,
    });
    return created;
  },
  async updatePost(id: number, input: Partial<{ title: string; slug: string; excerpt?: string; content: string; coverImageUrl?: string; type: string; isPublished: boolean }>) {
    const current = await prisma.post.findUnique({ where: { id } });
    if (!current) throw fail('Bài viết không tồn tại.', 404);
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'content', 'type', 'isPublished'] as const) {
      if (input[k] !== undefined) data[k] = input[k];
    }
    if (input.excerpt !== undefined) data.excerpt = input.excerpt || null;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl || null;
    if (input.slug) data.slug = await ensureUniqueSlug(input.slug, async (s) => {
      const found = await prisma.post.findUnique({ where: { slug: s } });
      return !!found && found.id !== id;
    });
    const becomingPublished = data.isPublished === true && !current.isPublished;
    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(data as Prisma.PostUpdateInput),
        ...(becomingPublished ? { publishedAt: new Date() } : {}),
      },
    });
    return updated;
  },
  async deletePost(id: number) {
    await prisma.post.delete({ where: { id } });
    return { id };
  },

  /* ---- Store info / settings ---- */
  publicSettings: async () => settingsToDTO(await repo.ensureSettings()),
  async updateSettings(input: Record<string, unknown>) {
    await repo.ensureSettings();
    Object.keys(input).forEach((k) => {
      if (input[k] === '') input[k] = null;
    });
    return settingsToDTO(await repo.updateSettings(input));
  },

  /* ---- Liên hệ / nhận tin ---- */
  async contact(input: { name: string; email: string; phone?: string; subject?: string; content: string; imageUrl?: string }) {
    return repo.createMessage({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject || null,
      content: input.content,
      imageUrl: input.imageUrl || null,
    });
  },
  async subscribe(email: string) {
    await repo.subscribe(email);
    return { email, active: true };
  },
  messages: {
    list: async (page: number, perPage: number) => {
      const [items, total] = await repo.listMessages(page, perPage);
      return {
        items: items.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
        meta: buildMeta(total, page, perPage),
      };
    },
    markRead: async (id: number) => {
      await repo.markMessageRead(id);
      return { id, isRead: true };
    },
  },
  subscribers: () => repo.listSubscribers(),
};
