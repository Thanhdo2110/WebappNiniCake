import type { Request, Response } from 'express';
import multer from 'multer';
import { uploadService } from '../services/upload.service.js';
import { bindController, created, fail } from '../utils/http.js';
import { envs } from '../config/env.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: envs.upload.maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ cho phép ảnh.'));
  },
});

export const multerSingle = (field = 'file') => upload.single(field);

export const uploadController = bindController({
  async single(req: Request, res: Response) {
    const file = req.file as
      | { buffer: Buffer; mimetype: string; originalname: string; size: number }
      | undefined;
    if (!file) throw fail('Không nhận được tệp nào để tải lên.');
    if (file.buffer.length === 0) throw fail('Tệp trống.');
    const result = await uploadService.saveImage({ buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname });
    return created(res, result, 'Đã tải ảnh lên.');
  },
});
