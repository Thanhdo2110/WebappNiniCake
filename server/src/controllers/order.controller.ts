import type { Request, Response } from 'express';
import { orderService } from '../services/order.service.js';
import { bindController, created, success } from '../utils/http.js';
import { orderToDTO } from '../utils/dto.js';

export const cartCheckoutCtl = bindController({
  /* khách đặt hàng */
  async checkout(req: Request, res: Response) {
    return created(res, await orderService.checkout(req, req.body), 'Đơn của quý khách đã được ghi nhận. Tiệm sẽ liên hệ xác nhận sớm nhất!');
  },
  async myOrders(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Number(req.query.perPage) || 10);
    return success(res, await orderService.listMine(req.auth!.id, page, perPage, req.query.status as string | undefined));
  },
  async myOrder(req: Request, res: Response) {
    return success(res, await orderService.getMine(req.auth!.id, Number(req.params.id)));
  },
  async cancelMine(req: Request, res: Response) {
    return success(res, await orderService.cancelMine(req.auth!.id, Number(req.params.id), req.body?.reason), 'Đơn đã được hủy. Xin thông cảm vì sự bất tiện!');
  },

  /* quản trị */
  async adminList(req: Request, res: Response) {
    return success(res, await orderService.listAdmin(req.query as never));
  },
  async adminOrder(req: Request, res: Response) {
    return success(res, await orderService.adminGet(Number(req.params.id)));
  },
  async adminUpdateStatus(req: Request, res: Response) {
    const result = await orderService.updateStatus(
      req.auth!.id,
      Number(req.params.id),
      req.body.status,
      req.body.note || undefined
    );
    return success(res, result, 'Đã cập nhật trạng thái đơn.');
  },
  async adminSetPayment(req: Request, res: Response) {
    return success(
      res,
      await orderService.setPayment(req.auth!.id, Number(req.params.id), req.body.paymentStatus, req.body.reference || undefined),
      'Đã cập nhật thanh toán.'
    );
  },
  async adminCancel(req: Request, res: Response) {
    const dto = orderToDTO;
    void dto;
    return success(res, await orderService.cancelOrder(Number(req.params.id), req.body?.reason || 'Hủy theo yêu cầu của cửa hàng.', true), 'Đã hủy đơn.');
  },
});
