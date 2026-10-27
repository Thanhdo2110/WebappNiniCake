import type { Request, Response } from 'express';
import { authService, issueSession, setRefreshCookie, clearRefreshCookie } from '../services/auth.service.js';
import { bindController, created, success } from '../utils/http.js';
import { userToDTO } from '../utils/dto.js';
import { envs } from '../config/env.js';

function refreshCookieToken(req: Request): string | undefined {
  const name = authService.REFRESH_COOKIE;
  return (req as Request & { cookies?: Record<string, string> }).cookies?.[name];
}

export const authController = bindController({
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body);
    const tokens = issueSession(user.id, user.email, 'CUSTOMER');
    await authService.saveRefresh(user.id, tokens.refreshToken);
    await authService.mergeGuestCartToUser(user.id, refreshCookieToken(req));
    setRefreshCookie(res, tokens.refreshToken);
    return created(res, { accessToken: tokens.accessToken, user: userToDTO(user) }, 'Đăng ký thành công. Xin chào quý khách!');
  },
  async login(req: Request, res: Response) {
    const user = await authService.login(req.body.email, req.body.password);
    const tokens = issueSession(user.id, user.email, user.role?.name || 'CUSTOMER');
    await authService.saveRefresh(user.id, tokens.refreshToken);
    await authService.mergeGuestCartToUser(user.id, refreshCookieToken(req));
    setRefreshCookie(res, tokens.refreshToken);
    return success(res, { accessToken: tokens.accessToken, user: userToDTO(user) }, 'Đăng nhập thành công. Kính mời quý khách!');
  },
  async refresh(req: Request, res: Response) {
    const token = refreshCookieToken(req);
    const result = await authService.refresh(token);
    if (!result) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    /* authService.refresh đã lưu token mới, không lưu lại lần hai */
    setRefreshCookie(res, result.refreshToken);
    return success(res, { accessToken: result.accessToken, user: userToDTO(result.user) });
  },
  async logout(req: Request, res: Response) {
    await authService.logout(refreshCookieToken(req));
    clearRefreshCookie(res);
    return success(res, { ok: true }, 'Đã đăng xuất. Hẹn gặp lại quý khách!');
  },
  async forgot(req: Request, res: Response) {
    const code = await authService.resetCodeOf(req.body.email);
    if (code && envs.mail.host) {
       
      console.info(`[MAIL] Đã gửi mã đặt lại mật khẩu cho ${req.body.email}: ${code}`);
    } else {
       
      console.info(`[DEV] Mã đặt lại mật khẩu cho ${req.body.email}: ${code ?? '(email không tồn tại)'}`);
    }
    return success(res, { sent: true }, 'Nếu email đã đăng ký, mã đặt lại gồm 6 chữ số sẽ được ghi vào console của server (hoặc gửi qua email khi cấu hình SMTP).');
  },
  async reset(req: Request, res: Response) {
    await authService.resetPassword(req.body.email, req.body.code, req.body.password);
    return success(res, { ok: true }, 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.');
  },
});
