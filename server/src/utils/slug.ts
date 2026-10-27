/** "Bánh Kem Socola Đen" -> "banh-kem-socola-den" (khuyến nghị tiếng Việt) */
export function vnSlug(input: string): string {
  const map: Record<string, string> = {
    ă: 'a', â: 'a', á: 'a', à: 'a', ả: 'a', ã: 'a', ạ: 'a',
    ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a', ắ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
    ê: 'e', é: 'e', è: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
    ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ô: 'o', ơ: 'o', ó: 'o', ò: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
    ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ư: 'u', ú: 'u', ù: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
    ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ỉ: 'i', ĩ: 'i', ị: 'i',
    ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
    đ: 'd',
  };
  return (input || '')
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Tạo slug duy nhất theo danh sách tồn tại */
export function ensureUniqueSlug(base: string, existsFn: (slug: string) => Promise<boolean>): Promise<string> {
  const root = vnSlug(base) || 'san-pham';
  return (async () => {
    let candidate = root;
    let i = 1;
    while (await existsFn(candidate)) {
      i += 1;
      candidate = `${root}-${i}`;
    }
    return candidate;
  })();
}
