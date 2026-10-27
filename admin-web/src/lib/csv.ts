/** Tải CSV đã trả về dưới dạng text và ép trình duyệt tải xuống */
import { getCsv } from '../lib/api';

export async function downloadCsv(url: string, filename: string, params?: Record<string, unknown>) {
  const text = await getCsv(url, params);
  const blob = new Blob([`\ufeff${text}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
