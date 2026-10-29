/** Sổ địa chỉ: thêm / sửa / xóa / mặc định — kiểm tra tại chỗ, xóa có xác nhận */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Navigation, Pencil, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react';
import type { AddressDTO } from '@shared/types';
import { get, post, patch, del, errMessage } from '../../lib/api';
import { useToast } from '../../hooks/toast';
import { useSeo } from '../../lib/seo';
import { EmptyState, LoadingBlock, Reveal, Stagger } from '../../components/ui';
import { ConfirmDialog } from '../../components/Overlay';
import { GeoPicker } from '../../components/GeoPicker';
import { mapsLink } from '../../lib/geo';
import { addressFormSchema } from '../../lib/validation';
import type { AddressForm } from '../../lib/validation';

const emptyDefaults: AddressForm = { fullName: '', phone: '', addressLine: '', ward: '', district: '', city: 'TP. Hồ Chí Minh' };

export default function AddressesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const addressesQ = useQuery({ queryKey: ['addresses'], queryFn: () => get<AddressDTO[]>('/addresses') });

  useSeo({ title: 'Sổ địa chỉ', description: 'Quản lý địa chỉ giao bánh của bạn trên Nini Cakes.' });

  const [editing, setEditing] = useState<number | null>(null);
  const [show, setShow] = useState(false);
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null; mapsUrl: string | null }>({ lat: null, lng: null, mapsUrl: null });
  const [isDefault, setIsDefault] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AddressDTO | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: emptyDefaults,
    mode: 'onBlur',
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['addresses'] });

  const saveM = useMutation({
    mutationFn: (values: AddressForm) => {
      const payload = { ...values, lat: geo.lat, lng: geo.lng, mapsUrl: geo.mapsUrl, isDefault };
      return editing
        ? patch<AddressDTO>(`/addresses/${editing}`, payload)
        : post<AddressDTO>('/addresses', payload);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu địa chỉ.', 'ok');
      reset(emptyDefaults);
      setGeo({ lat: null, lng: null, mapsUrl: null });
      setIsDefault(false);
      setEditing(null);
      setShow(false);
      refresh();
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const removeM = useMutation({
    mutationFn: (id: number) => del(`/addresses/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa địa chỉ.', 'ok'); setRemoveTarget(null); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const makeDefault = useMutation({
    mutationFn: (a: AddressDTO) => patch(`/addresses/${a.id}`, { ...a, isDefault: true }),
    onSuccess: (r) => { toast(r.message || 'Đã đặt làm địa chỉ mặc định.', 'ok'); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const startEdit = (a: AddressDTO) => {
    setEditing(a.id);
    reset({
      fullName: a.fullName, phone: a.phone, addressLine: a.addressLine,
      ward: a.ward || '', district: a.district || '', city: a.city,
    });
    setGeo({ lat: a.lat ?? null, lng: a.lng ?? null, mapsUrl: a.mapsUrl ?? null });
    setIsDefault(a.isDefault);
    setShow(true);
  };

  const closeForm = () => {
    setShow(false); setEditing(null); reset(emptyDefaults);
    setGeo({ lat: null, lng: null, mapsUrl: null }); setIsDefault(false);
  };

  /* Mở form lần đầu khi chưa có địa chỉ nào */
  const list = addressesQ.data || [];
  const addressCount = addressesQ.data?.length ?? 0;
  useEffect(() => {
    if (addressesQ.isSuccess && addressCount === 0) setShow(true);
  }, [addressesQ.isSuccess, addressCount]);

  const errOf = (k: keyof AddressForm) => errors[k]?.message;

  return (
    <div className="account-page">
      <Reveal as="div" className="account-page__head">
        <div>
          <span className="eyebrow">Giao nhận</span>
          <h3 className="account-page__title">Sổ địa chỉ <span className="faint">({list.length})</span></h3>
        </div>
        <button
          type="button"
          className="btn btn-gold btn-sm"
          aria-expanded={show}
          onClick={() => {
            if (show) { closeForm(); return; }
            setEditing(null);
            reset(emptyDefaults);
            setShow(true);
          }}
        >
          {show ? <><X size={14} /> Đóng</> : <><Plus size={14} /> Thêm địa chỉ</>}
        </button>
      </Reveal>

      <div className={`collapsible${show ? ' is-open' : ''}`}>
        <div>
          <form className="card pad addr-form" onSubmit={handleSubmit((v) => saveM.mutate(v))} noValidate>
            <div className="field"><label htmlFor="ad-fullName">Tên người nhận</label>
              <input id="ad-fullName" className={`input${errOf('fullName') ? ' is-invalid' : ''}`} maxLength={80}
                aria-invalid={!!errOf('fullName')} {...register('fullName')} />
              {errOf('fullName') && <span className="form-error">{errOf('fullName')}</span>}</div>
            <div className="field"><label htmlFor="ad-phone">Điện thoại</label>
              <input id="ad-phone" className={`input${errOf('phone') ? ' is-invalid' : ''}`} maxLength={11} inputMode="tel"
                placeholder="090..." aria-invalid={!!errOf('phone')} {...register('phone')} />
              {errOf('phone') && <span className="form-error">{errOf('phone')}</span>}</div>
            <div className="field field-grid__full"><label htmlFor="ad-line">Địa chỉ</label>
              <input id="ad-line" className={`input${errOf('addressLine') ? ' is-invalid' : ''}`} maxLength={200}
                placeholder="Số nhà, tên đường — ghim vị trí bên dưới để giao chính xác"
                aria-invalid={!!errOf('addressLine')} {...register('addressLine')} />
              {errOf('addressLine') && <span className="form-error">{errOf('addressLine')}</span>}</div>
            {/* ward/district/city không còn ô nhập: gửi ngầm theo giá trị mặc định/giá trị cũ khi sửa */}
            <div className="field field-grid__full">
              <GeoPicker
                value={geo}
                onChange={(g) => setGeo({ lat: g.lat ?? null, lng: g.lng ?? null, mapsUrl: g.mapsUrl ?? null })}
              />
            </div>
            <label className="check-row field-grid__full">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              Dùng làm địa chỉ mặc định
            </label>
            <div className="field-grid__full addr-form__actions">
              <button className="btn btn-primary btn-sm" disabled={saveM.isPending}>
                {saveM.isPending ? 'Đang lưu…' : editing ? 'Cập nhật' : 'Thêm mới'}
              </button>
              <button type="button" className="btn btn-soft btn-sm" onClick={closeForm}>Hủy</button>
            </div>
          </form>
        </div>
      </div>

      {addressesQ.isLoading && <LoadingBlock text="Đang mở sổ địa chỉ..." />}

      {addressesQ.isError && (
        <EmptyState icon="🫖" title="Chưa mở được sổ địa chỉ">
          <p className="small muted">{errMessage(addressesQ.error, 'Kết nối đến tiệm bị gián đoạn.')}</p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => addressesQ.refetch()}>
            <RotateCcw size={14} /> Thử lại
          </button>
        </EmptyState>
      )}

      {!addressesQ.isLoading && !addressesQ.isError && list.length === 0 && <EmptyState icon="📍" title="Chưa có địa chỉ nào" />}

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
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setRemoveTarget(a)} aria-label={`Xóa địa chỉ của ${a.fullName}`}>
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          </article>
        ))}
      </Stagger>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeM.mutate(removeTarget.id)}
        title="Xóa địa chỉ này?"
        message={removeTarget ? `${removeTarget.addressLine}${removeTarget.ward ? `, ${removeTarget.ward}` : ''}, ${removeTarget.city} sẽ bị xóa khỏi sổ địa chỉ.` : undefined}
        confirmLabel="Xóa"
        cancelLabel="Giữ lại"
        danger
        pending={removeM.isPending}
      />
    </div>
  );
}
