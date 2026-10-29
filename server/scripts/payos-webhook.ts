/** Đăng ký URL nhận IPN với PayOS.
    Chạy:  npm -w server run payos:webhook  (lấy PUBLIC_URL từ .env)
        hoặc:  npm -w server run payos:webhook -- https://tiem.vn/api/v1/webhooks/payos  */
import { payosService } from '../src/services/payos.service.js';
import { envs } from '../src/config/env.js';

const fromArg = process.argv[2];
const url = fromArg || (envs.payos.publicUrl ? `${envs.payos.publicUrl}/api/v1/webhooks/payos` : '');
if (!url.startsWith('https://')) {
  console.error('Cần URL HTTPS công khai (PayOS không gọi được http/localhost).');
  console.error('Ví dụ: npm -w server run payos:webhook -- https://ten-mien-cua-ban/api/v1/webhooks/payos');
  process.exit(1);
}

const res = await payosService.registerWebhook(url);
console.info('Đã đăng ký IPN:', url, res);
process.exit(0);
