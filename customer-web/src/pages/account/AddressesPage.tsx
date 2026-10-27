/** Sổ địa chỉ: thêm / sửa / xóa / mặc định */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MapPin, Navigation, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import type { AddressDTO } from '@shared/types';
import { get, post, patch, del, errMessage } from '../../lib/api';
import { useToast } from '../../hooks/toast';
import { EmptyState, LoadingBlock, Reveal, Stagger } from '../../components/ui';
import { GeoPicker } from '../../components/GeoPicker';
import { mapsLink } from '../../lib/geo';

const emptyForm = {
  fullName: '', phone: '', addressLine: '', ward: '', district: '', city: 'TP. Hồ Chí Minh',
  lat: null as number | null, lng: null as number | null, mapsUrl: null as string | null,
  isDefault: false,
};

export default function AddressesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const addressesQ = useQuery({ queryKey: ['addresses'], queryFn: () => get<AddressDTO[]>('/addresses') });

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [show, setShow] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['addresses'] });

  const saveM = useMutation({
    mutationFn: () =>
      editing
        ? patch<AddressDTO>(`/addresses/${editing}`, form)
        : post<AddressDTO>('/addresses', form),
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu địa chỉ.', 'ok');
      setForm(emptyForm); setEditing(null); setShow(false); refresh();
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const removeM = useMutation({
    mutationFn: (id: number) => del(`/addresses/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa địa chỉ.', 'ok'); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const makeDefault = useMutation({
    mutationFn: (a: AddressDTO) => patch(`/addresses/${a.id}`, { ...a, isDefault: true }),
    onSuccess: (r) => { toast(r.message || 'Đã đặt làm địa chỉ mặc định.', 'ok'); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const startEdit = (a: AddressDTO) => {
    setEditing(a.id);
    setForm({
      fullName: a.fullName, phone: a.phone, addressLine: a.addressLine,
      ward: a.ward || '', district: a.district || '', city: a.city,
      lat: a.lat ?? null, lng: a.lng ?? null, mapsUrl: a.mapsUrl ?? null,
      isDefault: a.isDefault,
    });
    setShow(true);
  };

  const list = addressesQ.data || [];

  return (
    <div className="account-page">
      <Reveal as="div" className="account-page__head">
        <div>
          <span className="eyebrow">Giao nhận</span>
          <h3 className="account-page__title">Sổ địa chỉ <span className="faint">({list.length})</span></h3>
        </div>
        <button type="button" className="btn btn-gold btn-sm" onClick={() => { setEditing(null); setForm(emptyForm); setShow(!show); }}>
          {show ? <><X size={14} /> Đóng</> : <><Plus size={14} /> Thêm địa chỉ</>}
        </button>
      </Reveal>

      <div className={`collapsible${show ? ' is-open' : ''}`}>
        <div>
          <form className="card pad addr-form" onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
            <div className="field"><label>Tên người nhận</label>
              <input className="input" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="field"><label>Điện thoại</label>
              <input className="input" required pattern="0\d{8,10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="field field-grid__full"><label>Địa chỉ</label>
              <input className="input" required minLength={5} value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} /></div>
            <div className="field"><label>Phường / xã</label>
              <input className="input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></div>
            <div className="field"><label>Quận / huyện</label>
              <input className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
            <div className="field"><label>Tỉnh / thành</label>
              <input className="input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="field field-grid__full">
              <GeoPicker
                value={{ lat: form.lat, lng: form.lng, mapsUrl: form.mapsUrl }}
                onChange={(g) => setForm({ ...form, lat: g.lat ?? null, lng: g.lng ?? null, mapsUrl: g.mapsUrl ?? null })}
              />
            </div>
            <label className="check-row field-grid__full">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Dùng làm địa chỉ mặc định
            </label>
            <div className="field-grid__full addr-form__actions">
              <button className="btn btn-primary btn-sm" disabled={saveM.isPending}>{editing ? 'Cập nhật' : 'Thêm mới'}</button>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => { setShow(false); setEditing(null); }}>Hủy</button>
            </div>
          </form>
        </div>
      </div>

      {addressesQ.isLoading && <LoadingBlock text="Đang mở sổ địa chỉ..." />}

      {!addressesQ.isLoading && list.length === 0 && <EmptyState icon="📍" title="Chưa có địa chỉ nào" />}

      <Stagger className="addr-cards">
        {list.map((a) => (
          <article key={a.id} className="card pad addr-row">
            <div className="addr-row__info">
              <div className="addr-row__name">
                <b>{a.fullName}</b>
                <span className="small muted">• {a.phone}</span>
                {a.isDefault && <span className="tag tag-gold"><Star size={11} /> Mặc định</span>}
              </div>
              <div className="small muted addr-row__line">
                <MapPin size={13} />
                <span>{a.addressLine}{a.ward ? `, ${a.ward}` : ''}{a.district ? `, ${a.district}` : ''}, {a.city}</span>
              </div>
              {a.lat !== null && a.lng !== null && (
                <a className="pin-chip" href={a.mapsUrl || mapsLink({ lat: a.lat, lng: a.lng })} target="_blank" rel="noreferrer">
                  <Navigation size={12} /> Đã ghim vị trí · mở Google Maps
                </a>
              )}
            </div>
            <div className="addr-row__actions">
              {!a.isDefault && <button type="button" className="btn btn-soft btn-sm" onClick={() => makeDefault.mutate(a)}>Mặc định</button>}
              <button type="button" className="btn btn-soft btn-sm" onClick={() => startEdit(a)}><Pencil size={13} /> Sửa</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeM.mutate(a.id)}><Trash2 size={13} /> Xóa</button>
            </div>
          </article>
        ))}
      </Stagger>
    </div>
  );
}
