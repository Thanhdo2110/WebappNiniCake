import { createApp } from './app.js';
import { envs } from './config/env.js';
import { prisma } from './config/prisma.js';

async function main() {
  const app = createApp();
  const port = envs.port;

  const server = app.listen(port, () => {
     
    console.info(`[SERVER] Nini Cakes API đang chạy tại http://localhost:${port}`);
     
    console.info(`[SERVER] Swagger: http://localhost:${port}/api-docs`);
  });

  const graceful = async (signal: string) => {
     
    console.info(`\n[SERVER] Nhận ${signal}, đang tắt...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => void graceful('SIGINT'));
  process.on('SIGTERM', () => void graceful('SIGTERM'));
  // Không để một request lỗi làm sập cả tiến trình
  process.on('unhandledRejection', (reason) => {
    console.error('[SERVER][unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[SERVER][uncaughtException]', err);
  });
}

main().catch(async (err) => {
   
  console.error('[SERVER] Khởi động thất bại:', err);
  await prisma.$disconnect();
  process.exit(1);
});
