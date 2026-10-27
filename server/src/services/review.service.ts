import { reviewRepository as repo } from '../repositories/review.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { fail } from '../utils/http.js';
import { buildMeta } from '../utils/pagination.js';
import { reviewToDTO } from '../utils/dto.js';

export const reviewService = {
  async create(userId: number, input: { productId: number; rating: number; comment?: string; imageUrl?: string }) {
    const product = await productRepository.getById(input.productId);
    if (!product) throw fail('Không tìm thấy sản phẩm.', 404);
    const data = {
      rating: input.rating,
      comment: input.comment || null,
      imageUrl: input.imageUrl || null,
    };
    const existing = await repo.findByProductAndUser(input.productId, userId);
    if (existing && !existing.deletedAt) {
      throw fail('Quý khách đã đánh giá mẫu bánh này rồi. Vui lòng xóa đánh giá cũ nếu muốn gửi mới.', 409);
    }
    const saved = existing
      ? await repo.revive(existing.id, data)
      : await repo.create({ productId: input.productId, userId, orderId: null, ...data });
    return { ...reviewToDTO(saved), productId: saved.productId, isApproved: saved.isApproved };
  },

  listMine: (userId: number) =>
    repo.listMine(userId).then((rows) => rows.map((r) => ({ ...reviewToDTO(r), product: r.product }))),

  deleteMine: async (userId: number, id: number) => {
    const mine = await repo.getMineById(userId, id);
    if (!mine) throw fail('Không tìm thấy đánh giá của bạn hoặc đã bị xóa.', 404);
    await repo.softDelete(id);
    await repo.refreshProductRating(mine.productId);
    return { id };
  },

  /* ============ Admin ============ */
  async adminList(query: { page: number; perPage: number; approved?: 'true' | 'false' }) {
    const { items, total } = await repo.listAdmin(query);
    return {
      items: items.map((r) => ({
        ...reviewToDTO(r),
        user: r.user ? { id: r.user.id, fullName: r.user.fullName, email: r.user.email } : null,
        product: r.product,
        isApproved: r.isApproved,
        isHidden: r.isHidden,
      })),
      meta: buildMeta(total, query.page, query.perPage),
    };
  },
  async approve(id: number, approve: boolean) {
    const review = await repo.getById(id);
    if (!review) throw fail('Không tìm thấy đánh giá.', 404);
    await repo.approve(id, approve);
    await repo.refreshProductRating(review.productId);
    return { id, isApproved: approve };
  },
  async setHidden(id: number, hidden: boolean) {
    const review = await repo.getById(id);
    if (!review) throw fail('Không tìm thấy đánh giá.', 404);
    await repo.setHidden(id, hidden);
    await repo.refreshProductRating(review.productId);
    return { id, isHidden: hidden };
  },
  async reply(id: number, reply: string) {
    const review = await repo.getById(id);
    if (!review) throw fail('Không tìm thấy đánh giá.', 404);
    await repo.reply(id, reply);
    return { id, reply };
  },
  async adminDelete(id: number) {
    const review = await repo.getById(id);
    if (!review) throw fail('Không tìm thấy đánh giá.', 404);
    await repo.softDelete(id);
    await repo.refreshProductRating(review.productId);
    return { id };
  },

  /* Hi lobbying seeds: hiển thị top đánh giá ở trang chủ */
  topReviews: (take = 6) => repo.topApproved(take),
};
