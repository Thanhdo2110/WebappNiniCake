/** Khuyến mãi: CRUD mã giảm giá PERCENT/AMOUNT */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { CouponAdminDTO, Paginated } from '@shared/types';
import { get, post, put, del, errMessage } from '../lib/api';
import { formatVND, parseAmount } from '../lib/format';
import { Loading, PageTitle, Empty, Pager, Modal } from '../components/ui';
import { useToast } from '../hooks/toast';

interface CouponForm {
  code: string; description: string; type: 'PERCENT' | 'AMOUNT';
  value: string; minSubtotal: string; maxDiscount: string; maxUses: string;
  startsAt: string; endsAt: string; isActive: boolean;
}
const blank: CouponForm = { code: '', description: '', type: 'PERCENT', value: '', minSubtotal: '0', maxDiscount: '', maxUses: '', startsAt: '', endsAt: '', isActive: true };

function toLocalInput(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CouponAdminDTO | null>(null);
  const [form, setForm] = useState<CouponForm>(blank);
  const [page, setPage] = useState(1);

  const q = useQuery({ queryKey: ['admin-coupons', page], queryFn: () => get<Paginated<CouponAdminDTO>>('/admin/coupons', { page, perPage: 12 }) });

  const saveM = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        type: form.type,
        value: form.type === 'PERCENT' ? Number(form.value) : parseAmount(form.value),
        minSubtotal: parseAmount(form.minSubtotal),
        maxDiscount: form.maxDiscount ? parseAmount(form.maxDiscount) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isActive: form.isActive,
      };
      return editing ? put(`/admin/coupons/${editing.id}`, body) : post('/admin/coupons', body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu mã.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setOpen(false);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const rmM = useMutation({
    mutationFn: (id: number) => del(`/admin/coupons/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa mã.', 'ok'); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (c: CouponAdminDTO) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || '', type: c.type, value: String(c.value),
      minSubtotal: String(c.minSubtotal || 0),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      maxUses: c.maxUses ? String(c.maxUses) : '',
      startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt), isActive: c.isActive,
    });
    setOpen(true);
  };

  return (
    <>
      <PageTitle title="Khuyến mãi / mã giảm giá" action={<button className="btn btn-gold btn-sm" onClick={openNew}>+ Tạo mã</button>} />
      {q.isLoading ? <Loading /> : (q.data?.items || []).length === 0 ? (
        <Empty title="Chưa có mã nào" />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Mã</th><th>Loại + giá trị</th><th>Điều kiện</th><th>Lượt dùng</th><th>Thời hạn</th><th>Sống</th><th></th></tr></thead>
              <tbody>
                {(q.data?.items || []).map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.code}</b><div className="small muted">{c.description}</div></td>
                    <td>
                      {c.type === 'PERCENT' ? `Giảm ${c.value}%` : `Giảm ${formatVND(c.value)}`}
                      {c.maxDiscount && <div className="small muted">tối đa {formatVND(c.maxDiscount)}</div>}
                    </td>
                    <td className="small">{c.minSubtotal > 0 ? `Chờ đơn ≥ ${formatVND(c.minSubtotal)}` : 'Không điều kiện'}</td>
                    <td className="small">{c.usedCount}{c.maxUses ? `/ ${c.maxUses}` : ''}</td>
                    <td className="small">
                      {c.startsAt ? c.startsAt.slice(0, 10) + ' → ' : ''}{c.endsAt ? c.endsAt.slice(0, 10) : '∞'}
                    </td>
                    <td><span className={`tag ${c.isActive ? 'tag-green' : 'tag-gray'}`}>{c.isActive ? 'Đang chạy' : 'Tạm bắt'}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Sửa</button>
                      <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }}
                        onClick={() => { if (window.confirm(`Xóa mã ${c.code}?`)) rmM.mutate(c.id); }}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} page={page} onPage={setPage} />}
        </>
      )}

      <Modal open={open} title={editing ? `Sửa mã ${editing.code}` : 'Tạo mã giảm giá'} onClose={() => setOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
          <div className="grid-form">
            <div className="field">
              <label>Mã (A-Z, 0-9, _: 3–30 ký tự)</label>
              <input className="input" required pattern="[A-Z0-9_-]{3,30}" value={form.code}
                style={{ textTransform: 'uppercase' }}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="field">
              <label>Loại</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENT' | 'AMOUNT' })}>
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="AMOUNT">Số tiền (₫)</option>
              </select>
            </div>
            <div className="field">
              <label>{form.type === 'PERCENT' ? 'Giảm bao nhiêu % (1–100)' : 'Giảm bao nhiêu ₫'}</label>
              <input className="input" required type="number" min={1} max={form.type === 'PERCENT' ? 100 : 1_000_000_000}
                value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="field">
              <label>Đơn tối thiểu (₫)</label>
              <input className="input" inputMode="numeric" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
            </div>
            <div className="field">
              <label>Giảm tối đa (₫, để trống = không trần)</label>
              <input className="input" inputMode="numeric" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
            </div>
            <div className="field">
              <label>Tổng lượt dùng (trống = vô hạn)</label>
              <input className="input" type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            </div>
            <div className="field">
              <label>Mở từ</label>
              <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div className="field">
              <label>Đến</label>
              <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
            <div className="field">
              <label>Mô tả (không bắt buộc)</label>
              <input className="input" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <label className="check-row mb-8">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang chạy
          </label>
          <button className="btn btn-primary" disabled={saveM.isPending}>{saveM.isPending ? 'Đang lưu...' : 'Lưu mã'}</button>
        </form>
      </Modal>
    </>
  );
}
