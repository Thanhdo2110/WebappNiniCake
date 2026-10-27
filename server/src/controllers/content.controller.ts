import type { Request, Response } from 'express';
import { contentService } from '../services/content.service.js';
import { bindController, created, success } from '../utils/http.js';
import { toCsv, csvResponse } from '../utils/csv.js';

export const contentController = bindController({
  /* public */
  banners: async (_req: Request, res: Response) => success(res, await contentService.activeBanners()),
  settings: async (_req: Request, res: Response) => success(res, await contentService.publicSettings()),
  posts: async (req: Request, res: Response) => success(res, await contentService.listPosts(req.query.type as string | undefined)),
  post: async (req: Request, res: Response) => success(res, await contentService.getPostBySlug(req.params.slug)),
  contact: async (req: Request, res: Response) =>
    created(
      res,
      await contentService.contact(req.body),
      'Tin nhắn của quý khách đã được gửi tới Nini Cakes. Chúng tôi sẽ phản hồi trong vòng 24h. Xin cảm ơn!'
    ),
  subscribe: async (req: Request, res: Response) =>
    created(res, await contentService.subscribe(req.body.email), 'Đăng ký nhận tin thành công. Cảm ơn quý khách!'),

  /* admin: banners */
  adminBanners: async (_req: Request, res: Response) => success(res, await contentService.allBanners()),
  createBanner: async (req: Request, res: Response) => created(res, await contentService.createBanner(req.body), 'Đã thêm banner.'),
  updateBanner: async (req: Request, res: Response) => success(res, await contentService.updateBanner(Number(req.params.id), req.body), 'Đã cập nhật banner.'),
  deleteBanner: async (req: Request, res: Response) => success(res, await contentService.deleteBanner(Number(req.params.id)), 'Đã xóa banner.'),

  /* admin: posts */
  adminPosts: async (req: Request, res: Response) =>
    success(res, await contentService.listPosts(req.query.type as string | undefined, false)),
  createPost: async (req: Request, res: Response) => created(res, await contentService.createPost(req.body), 'Đã tạo bài viết.'),
  updatePost: async (req: Request, res: Response) => success(res, await contentService.updatePost(Number(req.params.id), req.body), 'Đã cập nhật bài viết.'),
  deletePost: async (req: Request, res: Response) => success(res, await contentService.deletePost(Number(req.params.id)), 'Đã xóa bài viết.'),

  /* admin: settings */
  adminSettings: async (_req: Request, res: Response) => success(res, await contentService.publicSettings()),
  updateSettings: async (req: Request, res: Response) =>
    success(res, await contentService.updateSettings(req.body), 'Đã lưu thông tin cửa hàng.'),

  /* admin: messages & subscribers */
  messages: async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Number(req.query.perPage) || 15);
    return success(res, await contentService.messages.list(page, perPage));
  },
  markMessageRead: async (req: Request, res: Response) => success(res, await contentService.messages.markRead(Number(req.params.id)), 'Đã đánh dấu đọc.'),
  exportSubscribers: async (_req: Request, res: Response) => {
    const subs = await contentService.subscribers();
    return csvResponse(
      res,
      'nini-newsletter.csv',
      toCsv(['Email', 'Đã đăng ký ngày'], subs.map((s) => [s.email, s.subscribedAt.toISOString().slice(0, 10)]))
    );
  },
});
