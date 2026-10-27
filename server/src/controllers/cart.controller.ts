import type { Request, Response } from 'express';
import { cartService } from '../services/cart.service.js';
import { bindController, created, success } from '../utils/http.js';

export const cartController = bindController({
  async getCart(req: Request, res: Response) {
    return success(res, await cartService.getCart(req));
  },
  async addItem(req: Request, res: Response) {
    return created(res, await cartService.addItem(req, req.body), 'Đã thêm bánh vào giỏ.');
  },
  async updateItem(req: Request, res: Response) {
    return success(res, await cartService.updateItem(req, Number(req.params.id), req.body.quantity), 'Đã cập nhật giỏ hàng.');
  },
  async removeItem(req: Request, res: Response) {
    return success(res, await cartService.removeItem(req, Number(req.params.id)), 'Đã xóa khỏi giỏ hàng.');
  },
  async clear(req: Request, res: Response) {
    return success(res, await cartService.clear(req), 'Giỏ hàng đã trống.');
  },
});
