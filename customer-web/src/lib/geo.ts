/** Định vị Google Maps không cần API key: tách toạ độ từ link, nhúng bản đồ, chỉ đường */
export interface GeoPoint { lat: number; lng: number }

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);

const NUM = String.raw`(-?\d{1,3}(?:\.\d{1,10})?)`;

/** Nhận link Google Maps nhiều dạng hoặc chuỗi "vĩ độ, kinh độ"; trả về toạ độ hoặc null */
export function parseMapsUrl(raw: string): GeoPoint | null {
  const text = (raw || '').trim();
  if (!text) return null;

  const pick = (m: RegExpMatchArray | null): GeoPoint | null => {
    if (!m) return null;
    const lat = Number.parseFloat(m[1]);
    const lng = Number.parseFloat(m[2]);
    return inRange(lat, lng) ? { lat, lng } : null;
  };

  // Chuỗi trần "10.762624, 106.660903" — chỉ khi không phải link
  if (!/[:/]/.test(text)) {
    const bare = pick(text.match(new RegExp(`^${NUM}\\s*,\\s*${NUM}$`, 'i')));
    if (bare) return bare;
  }

  const patterns: RegExp[] = [
    new RegExp(String.raw`[?&](?:q|query|destination|viewpoint|center|ll)=${NUM},${NUM}`, 'i'),
    new RegExp(String.raw`!3d${NUM}!2d${NUM}`, 'i'),
    new RegExp(String.raw`@${NUM},${NUM}`, 'i'),
    new RegExp(String.raw`/(?:search|place)/${NUM},${NUM}`, 'i'),
  ];
  for (const re of patterns) {
    const point = pick(text.match(re));
    if (point) return point;
  }
  return null;
}

export const formatCoord = (p: GeoPoint): string => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;

/** Link chuẩn để lưu vào hồ sơ — mở được trên app Google Maps */
export const mapsLink = (p: GeoPoint): string =>
  `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/** Link chỉ đường tới điểm đã ghim */
export const directionsLink = (p: GeoPoint): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/** Bản đồ nhúng xem trước, không cần key */
export const embedLink = (p: GeoPoint, zoom = 16): string =>
  `https://maps.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&z=${zoom}&output=embed`;

/** Link tìm kiếm theo địa chỉ chữ (dùng cho đơn cũ chưa có toạ độ) */
export const searchLink = (addressText: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

/** Bản đồ nhúng theo địa chỉ chữ, không cần key */
export const embedAddressLink = (addressText: string, zoom = 15): string =>
  `https://maps.google.com/maps?q=${encodeURIComponent(addressText)}&z=${zoom}&output=embed`;

export function getCurrentPosition(timeoutMs = 12_000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Trình duyệt này không hỗ trợ lấy vị trí.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const reason = err.code === err.PERMISSION_DENIED
          ? 'Bạn đã từ chối quyền vị trí. Hãy bật quyền cho Nini Cakes trong trình duyệt.'
          : err.code === err.TIMEOUT
            ? 'Hết thời gian xác định vị trí — thử lại khi kết nối ổn định hơn.'
            : 'Chưa lấy được vị trí. Bạn có thể dán link Google Maps thay thế.';
        reject(new Error(reason));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
