import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { envs } from '../config/env.js';
import { fail } from '../utils/http.js';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

export const uploadService = {
  /* Multer memory → save disk (local) hoặc upload Cloudinary */
  async saveImage(file: { buffer: Buffer; mimetype: string; originalname: string } | undefined) {
    if (!file) throw fail('Vui lòng chọn tệp ảnh để upload.', 400);
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) throw fail('Định đạng ảnh không được phép (chọn JPEG/PNG/WebP/GIF/AVIF).', 400);
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;

    if (envs.upload.driver === 'cloudinary' && envs.upload.cloudinaryUrl) {
      const { v2 } = await import('cloudinary');
      v2.config({ secure: true });
      const b64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const result = await v2.uploader.upload(b64, { public_id: `ninicakes/${filename.replace(ext, '')}`, overwrite: false });
      return { url: result.secure_url, driver: 'cloudinary' };
    }

    const dir = path.resolve(process.cwd(), envs.upload.dir, 'images');
    await fs.promises.mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    await fs.promises.writeFile(filepath, file.buffer);
    return { url: `/uploads/images/${filename}`, driver: 'local' };
  },

  staticDir() {
    return path.resolve(process.cwd(), envs.upload.dir);
  },
};
