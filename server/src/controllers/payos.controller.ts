import type { Request, Response } from 'express';
import { payosService } from '../services/payos.service.js';
import { bindController, success } from '../utils/http.js';

export const payosCtl = bindController({
  /* khách: lấy (hoặc tạo) mã QR chuyển khoản cho đơn của mình */
  async link(req: Request, res: Response) {
    return success(res, await payosService.ensureLink(req.auth!.id, Number(req.params.id)), 'Đã chuẩn bị mã thanh toán.');
  },
  async sync(req: Request, res: Response) {
    return success(res, await payosService.syncMine(req.auth!.id, Number(req.params.id)));
  },

  /* PayOS gọi vào đây — body đã được verify chữ ký trong service */
  async webhook(req: Request, res: Response) {
    await payosService.handleWebhook(req.body);
    return res.status(200).json({ success: true, message: 'OK' });
  },
});
