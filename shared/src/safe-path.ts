/** Chặn open redirect khi điều hướng tới đường dẫn lấy từ URL / dữ liệu do người dùng đưa vào.

    `startsWith('/')` là KHÔNG đủ: `//evil.com` và `/\evil.com` đều bắt đầu bằng `/`
    nhưng trình duyệt phân tích thành liên kết tới host khác (`/\` được chuẩn hoá
    thành `//` với URL có scheme đặc biệt). Ở đây giao việc phân tích cho chính
    URL parser rồi so sánh origin, nên mọi biến thể chuẩn hoá đều bị bắt. */
const SENTINEL = 'http://nini.internal';

export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith('/')) return false;
  try {
    return new URL(path, SENTINEL).origin === SENTINEL;
  } catch {
    return false;
  }
}
