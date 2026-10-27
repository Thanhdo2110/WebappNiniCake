import type { Request, Response } from 'express';
import { couponService } from '../services/coupon.service.js';
import { reviewService } from '../services/review.service.js';
import { bindController, created, success } from '../utils/http.js';
import { buildMeta } from '../utils/pagination.js';

export const commerceController = bindController({
  /* coupons */
  async validateCoupon(req: Request, res: Response) {
    return success(res, await couponService.validate(req.body.code, Number(req.body.subtotal) || 0));
  },
  async adminList(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Number(req.query.perPage) || 20);
    return success(res, await couponService.adminList(page, perPage));
  },
  async adminCreate(req: Request, res: Response) {
    return created(res, await couponService.adminCreate(req.body), 'Đã tạo mã giảm giá.');
  },
  async adminUpdate(req: Request, res: Response) {
    return success(res, await couponService.adminUpdate(Number(req.params.id), req.body), 'Đã cập nhật mã.');
  },
  async adminDelete(req: Request, res: Response) {
    return success(res, await couponService.adminDelete(Number(req.params.id)), 'Đã xóa mã.');
  },

  /* reviews (public + mine) */
  async createReview(req: Request, res: Response) {
    return created(res, await reviewService.create(req.auth!.id, req.body), 'Cảm ơn quý khách. Đánh giá sẽ được hiển thị sau khi tiệm kiểm duyệt!');
  },
  async myReviews(req: Request, res: Response) {
    return success(res, await reviewService.listMine(req.auth!.id));
  },
  async deleteMyReview(req: Request, res: Response) {
    return success(res, await reviewService.deleteMine(req.auth!.id, Number(req.params.id)), 'Đã xóa đánh giá.');
  },
  async adminReviews(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Number(req.query.perPage) || 12);
    const approved = req.query.approved as 'true' | 'false' | undefined;
    return success(res, await reviewService.adminList({ page, perPage, approved }));
  },
  async approveReview(req: Request, res: Response) {
    return success(res, await reviewService.approve(Number(req.params.id), req.body.approve !== false), req.body.approve !== false ? 'Đã duyệt đánh giá.' : 'Đã gỡ duyệt.');
  },
  async hideReview(req: Request, res: Response) {
    return success(res, await reviewService.setHidden(Number(req.params.id), req.body.hide !== false), req.body.hide !== false ? 'Đã ẩn đánh giá.' : 'Đã hiện lại đánh giá.');
  },
  async replyReview(req: Request, res: Response) {
    return success(res, await reviewService.reply(Number(req.params.id), req.body.reply), 'Đã gửi phản hồi.');
  },
  async adminDeleteReview(req: Request, res: Response) {
    return success(res, await reviewService.adminDelete(Number(req.params.id)), 'Đã xóa đánh giá.');
  },
  topReviews: async (_req: Request, res: Response) => {
    const data = await reviewService.topReviews(6);
    return success(res, data);
  },
  meta5: buildMeta,
});
