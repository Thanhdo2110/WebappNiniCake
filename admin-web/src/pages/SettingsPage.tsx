/** Cài đặt tiệm: thông tin cửa hàng, thanh toán chuyển khoản, phí giao bánh (chỉ ADMIN) */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { StoreSettingsDTO } from '@shared/types';
import { get, put, errMessage } from '../lib/api';
import { formatVND, parseAmount } from '../lib/format';
import { Loading, PageTitle, Empty } from '../components/ui';
import { useToast } from '../hooks/toast';

type Field = keyof StoreSettingsDTO;
const TEXT_FIELDS: Array<{ key: Field; label: string; hint?: string; email?: boolean; min?: number; max?: number }> = [
  { key: 'name', label: 'Tên cửa hàng (2–120 ký tự)', min: 2, max: 120 },
  { key: 'slogan', label: 'Khẩu hiệu (không bắt buộc)', max: 200 },
  { key: 'address', label: 'Địa chỉ cửa hàng (5–200 ký tự)', min: 5, max: 200 },
  { key: 'phone', label: 'Điện thoại (8–20 ký tự)', min: 8, max: 20 },
  { key: 'email', label: 'Email tiếp đón', email: true, max: 120 },
  { key: 'openingHours', label: 'Giờ mở cửa (3–120 ký tự)', min: 3, max: 120 },
  { key: 'facebook', label: 'Link Facebook (không bắt buộc)', max: 200 },
  { key: 'instagram', label: 'Link Instagram (không bắt buộc)', max: 200 },
  { key: 'zalo', label: 'Zalo (không bắt buộc, tối đa 20 ký tự)', max: 20 },
  { key: 'bankName', label: 'Tên ngân hàng (3–120 ký tự)', min: 3, max: 120 },
  { key: 'bankAccountName', label: 'Tên chủ tài khoản (3–120 ký tự)', min: 3, max: 120 },
  { key: 'bankAccountNumber', label: 'Số tài khoản (6–30 ký tự)', min: 6, max: 30 },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<StoreSettingsDTO>('/admin/settings') });
  const [form, setForm] = useState<Record<Field, string>>({
    name: '', slogan: '', address: '', phone: '', email: '', openingHours: '',
    facebook: '', instagram: '', zalo: '', bankName: '', bankAccountName: '',
    bankAccountNumber: '', shippingFeeVnd: '', freeShippingMinVnd: '',
  });

  useEffect(() => {
    if (!q.data) return;
    setForm({
      name: q.data.name,
      slogan: q.data.slogan || '',
      address: q.data.address,
      phone: q.data.phone,
      email: q.data.email,
      openingHours: q.data.openingHours,
      facebook: q.data.facebook || '',
      instagram: q.data.instagram || '',
      zalo: q.data.zalo || '',
      bankName: q.data.bankName,
      bankAccountName: q.data.bankAccountName,
      bankAccountNumber: q.data.bankAccountNumber,
      shippingFeeVnd: String(q.data.shippingFeeVnd),
      freeShippingMinVnd: String(q.data.freeShippingMinVnd),
    });
  }, [q.data]);

  const saveM = useMutation({
    mutationFn: () => put('/admin/settings', {
      ...form,
      name: form.name.trim(),
      slogan: form.slogan.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      openingHours: form.openingHours.trim(),
      facebook: form.facebook.trim(),
      instagram: form.instagram.trim(),
      zalo: form.zalo.trim(),
      bankName: form.bankName.trim(),
      bankAccountName: form.bankAccountName.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      shippingFeeVnd: parseAmount(form.shippingFeeVnd),
      freeShippingMinVnd: parseAmount(form.freeShippingMinVnd),
    }),
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu cài đặt.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  if (q.isLoading) return <Loading text="Đang lấy cài đặt tiệm..." />;
  if (q.isError || !q.data) return <Empty title="Không lấy được cài đặt. Vui lòng thử lại." />;

  return (
    <>
      <PageTitle title="Cài đặt tiệm"
        action={<button className="btn btn-primary btn-sm" disabled={saveM.isPending} onClick={() => saveM.mutate()}>💾 Lưu thay đổi</button>} />

      <div className="card pad" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Thông tin cửa hàng (hiện ở chân trang, trang liên hệ và hóa đơn)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          {TEXT_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <input className="input"
                type={f.email ? 'email' : 'text'}
                required={!/không bắt buộc/.test(f.label)}
                minLength={f.min} maxLength={f.max || 300}
                value={form[f.key]}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value as string }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Giao bánh & thanh toán</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Phí giao bánh mặc định (đồng, hiện tại: {formatVND(q.data.shippingFeeVnd)})</label>
            <input className="input" type="number" min={0} max={500000} value={form.shippingFeeVnd}
              onChange={(e) => setForm((s) => ({ ...s, shippingFeeVnd: e.target.value }))} />
            <div className="small muted" style={{ marginTop: 4 }}>Áp dụng cho đơn giao tận nơi chưa đạt mức miễn phí.</div>
          </div>
          <div className="field">
            <label>Miễn phí giao từ tổng tiền (đồng, hiện tại: {formatVND(q.data.freeShippingMinVnd)})</label>
            <input className="input" type="number" min={0} max={100000000} value={form.freeShippingMinVnd}
              onChange={(e) => setForm((s) => ({ ...s, freeShippingMinVnd: e.target.value }))} />
            <div className="small muted" style={{ marginTop: 4 }}>Đơn đạt mốc này được miễn phí giao trong phạm vi cửa hàng.</div>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Thông tin tài khoản ngân hàng dùng cho hướng dẫn chuyển khoản tại bước thanh toán và trong hóa đơn.
        </p>
      </div>

      <button className="btn btn-primary" disabled={saveM.isPending} onClick={() => saveM.mutate()}>
        {saveM.isPending ? 'Đang lưu...' : '💾 Lưu cài đặt'}
      </button>
    </>
  );
}
