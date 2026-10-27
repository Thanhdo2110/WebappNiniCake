/** Ghim vị trí Google Maps cho địa chỉ: GPS trình duyệt hoặc dán link, không cần API key */
import { useState } from 'react';
import { Crosshair, ExternalLink, MapPin, Navigation, Route } from 'lucide-react';
import {
  directionsLink, embedLink, formatCoord, getCurrentPosition, mapsLink, parseMapsUrl,
} from '../lib/geo';
import type { GeoPoint } from '../lib/geo';

export interface GeoValue {
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
}

export function GeoPicker({ value, onChange }: { value: GeoValue; onChange: (next: GeoValue) => void }) {
  const point: GeoPoint | null =
    typeof value.lat === 'number' && typeof value.lng === 'number' ? { lat: value.lat, lng: value.lng } : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const save = (p: GeoPoint) => {
    setError(null);
    onChange({ lat: p.lat, lng: p.lng, mapsUrl: mapsLink(p) });
  };

  const locate = async () => {
    setBusy(true);
    setError(null);
    try {
      save(await getCurrentPosition());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lấy được vị trí.');
    } finally {
      setBusy(false);
    }
  };

  const pinLink = () => {
    const p = parseMapsUrl(link);
    if (!p) {
      setError('Không đọc được toạ độ từ link. Mở Google Maps → Chia sẻ → sao chép link có dạng "?q=10.7626,106.6609" hoặc dán trực tiếp "vĩ độ, kinh độ".');
      return;
    }
    save(p);
    setLink('');
  };

  const drop = () => {
    onChange({ lat: null, lng: null, mapsUrl: null });
    setError(null);
  };

  return (
    <div className="geo-picker">
      <div className="geo-picker__head">
        <span className="eyebrow no-rule"><MapPin size={12} /> Định vị nơi nhận</span>
        {point && <button type="button" className="link-del" onClick={drop}>bỏ ghim</button>}
      </div>
      <p className="small muted geo-picker__hint">
        Ghim đúng chỗ giao để tài xế không phải gọi hỏi đường — không bắt buộc.
      </p>

      <div className="geo-picker__row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void locate()} disabled={busy}>
          <Crosshair size={14} /> {busy ? 'Đang xác định…' : 'Lấy vị trí hiện tại'}
        </button>
        <span className="geo-picker__or">hoặc dán link</span>
        <input
          className="input geo-picker__input"
          placeholder="https://maps.app.goo.gl/…  ·  hoặc 10.762624, 106.660903"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pinLink(); } }}
          aria-label="Link Google Maps"
        />
        <button type="button" className="btn btn-soft btn-sm" onClick={pinLink} disabled={!link.trim()}>
          <Route size={14} /> Ghim
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {point && (
        <div className="geo-preview">
          <iframe
            className="geo-preview__map"
            title="Bản đồ vị trí đã ghim"
            src={embedLink(point)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="geo-preview__meta">
            <b className="geo-preview__coord">{formatCoord(point)}</b>
            <div className="geo-preview__links">
              <a href={mapsLink(point)} target="_blank" rel="noreferrer">
                <ExternalLink size={13} /> Mở Google Maps
              </a>
              <a href={directionsLink(point)} target="_blank" rel="noreferrer">
                <Navigation size={13} /> Chỉ đường tới đây
              </a>
            </div>
            <span className="small muted">Nhà trong hẻm hay chung cư? Ghi rõ ở phần ghi chú cho tiệm.</span>
          </div>
        </div>
      )}
    </div>
  );
}
