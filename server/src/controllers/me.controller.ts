import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { authService } from '../services/auth.service.js';
import { bindController, created, success } from '../utils/http.js';
import { userToDTO } from '../utils/dto.js';

export const meController = bindController({
  async profile(req: Request, res: Response) {
    return success(res, await userService.profile(req.auth!.id));
  },
  async updateProfile(req: Request, res: Response) {
    const dto = await userService.updateProfile(req.auth!.id, req.body);
    return success(res, dto, 'Hồ sơ đã được cập nhật.');
  },
  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.auth!.id, req.body.currentPassword, req.body.newPassword);
    return success(res, { ok: true }, 'Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.');
  },

  async addresses(req: Request, res: Response) {
    return success(res, await userService.listAddresses(req.auth!.id));
  },
  async createAddress(req: Request, res: Response) {
    return created(res, await userService.createAddress(req.auth!.id, req.body));
  },
  async updateAddress(req: Request, res: Response) {
    return success(res, await userService.updateAddress(req.auth!.id, Number(req.params.id), req.body), 'Địa chỉ đã cập nhật.');
  },
  async deleteAddress(req: Request, res: Response) {
    return success(res, await userService.deleteAddress(req.auth!.id, Number(req.params.id)), 'Đã xóa địa chỉ.');
  },

  async wishlist(req: Request, res: Response) {
    return success(res, await userService.wishlist(req.auth!.id));
  },
  async addWishlist(req: Request, res: Response) {
    return success(res, await userService.addWishlist(req.auth!.id, Number(req.params.productId)), 'Đã thêm vào danh sách yêu thích.');
  },
  async removeWishlist(req: Request, res: Response) {
    return success(res, await userService.removeWishlist(req.auth!.id, Number(req.params.productId)), 'Đã bỏ khỏi danh sách yêu thích.');
  },

  /* Admin: khách hàng & nhân viên */
  async adminListUsers(req: Request, res: Response) {
    /* qua validate(roleParam) nên luôn là ADMIN | STAFF | CUSTOMER (đã chuẩn hóa hoa) */
    const role = (req.body.role ?? req.params.role) as 'ADMIN' | 'STAFF' | 'CUSTOMER';
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(50, Number(req.query.perPage) || 12);
    const q = req.query.q as string | undefined;
    return success(res, await userService.adminListUsers(role, q, page, perPage));
  },
  async adminUserDetail(req: Request, res: Response) {
    return success(res, await userService.adminDetail(Number(req.params.id)));
  },
  async blockUser(req: Request, res: Response) {
    const blocked = req.body?.blocked ?? true;
    return success(res, await userService.blockUser(Number(req.params.id), blocked), blocked ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
  },
  async createStaff(req: Request, res: Response) {
    const user = await userService.createStaff(req.body);
    return created(res, userToDTO(user), 'Đã tạo tài khoản nhân viên.');
  },
});
