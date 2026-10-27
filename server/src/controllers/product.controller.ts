import type { Request, Response } from 'express';
import { productService } from '../services/product.service.js';
import { catalogService } from '../services/catalog.service.js';
import { bindController, created, success } from '../utils/http.js';

export const productController = bindController({
  /* public */
  async list(req: Request, res: Response) {
    return success(res, await productService.list(req.body));
  },
  async detail(req: Request, res: Response) {
    return success(res, await productService.detail(req.params.slug));
  },
  async detailReviews(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(30, Number(req.query.perPage) || 8);
    return success(res, await productService.reviewsPage(req.params.slug, page, perPage));
  },

  /* admin */
  async adminList(req: Request, res: Response) {
    const query = req.query as Record<string, string | undefined>;
    return success(
      res,
      await productService.adminList({
        page: Number(query.page) || 1,
        perPage: Number(query.perPage) || 12,
        q: query.q,
        categoryId: query.categoryId ? Number(query.categoryId) : undefined,
        isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
        featured: query.featured === 'true' ? true : query.featured === 'false' ? false : undefined,
        seasonal: query.seasonal === 'true' ? true : query.seasonal === 'false' ? false : undefined,
        sort: query.sort,
      })
    );
  },
  async adminGet(req: Request, res: Response) {
    return success(res, await productService.adminGet(Number(req.params.id)));
  },
  async adminCreate(req: Request, res: Response) {
    return created(res, await productService.create(req.body), 'Đã thêm sản phẩm mới.');
  },
  async adminUpdate(req: Request, res: Response) {
    return success(res, await productService.update(Number(req.params.id), req.body), 'Danh sách bánh đã được cập nhật.');
  },
  async adminDelete(req: Request, res: Response) {
    const hard = req.query.hard === 'true';
    return success(res, await productService.adminDelete(Number(req.params.id), hard), hard ? 'Đã xóa vĩnh viễn.' : 'Đã đưa sản phẩm vào kho ẩn.');
  },

  /* categories */
  async categories(req: Request, res: Response) {
    return success(res, await catalogService.listCategories());
  },
  async createCategory(req: Request, res: Response) {
    return created(res, await catalogService.createCategory(req.body));
  },
  async updateCategory(req: Request, res: Response) {
    return success(res, await catalogService.updateCategory(Number(req.params.id), req.body));
  },
  async deleteCategory(req: Request, res: Response) {
    return success(res, await catalogService.deleteCategory(Number(req.params.id)), 'Đã xóa danh mục.');
  },

  /* ingredients & allergens */
  async ingredients(req: Request, res: Response) {
    return success(res, await catalogService.listIngredients());
  },
  async createIngredient(req: Request, res: Response) {
    return created(res, await catalogService.createIngredient(req.body));
  },
  async updateIngredient(req: Request, res: Response) {
    return success(res, await catalogService.updateIngredient(Number(req.params.id), req.body));
  },
  async deleteIngredient(req: Request, res: Response) {
    return success(res, await catalogService.deleteIngredient(Number(req.params.id)), 'Đã xóa nguyên liệu.');
  },
  async allergens(req: Request, res: Response) {
    return success(res, await catalogService.listAllergens());
  },
  async createAllergen(req: Request, res: Response) {
    return created(res, await catalogService.createAllergen(req.body));
  },
  async updateAllergen(req: Request, res: Response) {
    return success(res, await catalogService.updateAllergen(Number(req.params.id), req.body));
  },
  async deleteAllergen(req: Request, res: Response) {
    return success(res, await catalogService.deleteAllergen(Number(req.params.id)), 'Đã xóa thông tin dị ứng.');
  },
});
