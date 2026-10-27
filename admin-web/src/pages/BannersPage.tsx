/** Banner trang chủ: thêm / sửa / xóa + bật tắt hiển thị + upload ảnh */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { BannerDTO } from '@shared/types';
import { del, errMessage, get, post, put, uploadFile } from '../lib/api';
import { imageUrl } from '../lib/placeholder';
import { Loading, PageTitle, Empty, Modal } from '../components/ui';
import { FlexTag } from '../components/bits';
import { useToast } from '../hooks/toast';

interface BannerForm {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  isActive: boolean;
}
const blank: BannerForm = { title: '', subtitle: '', imageUrl: '', linkUrl: '', sortOrder: '0', isActive: true };
const toForm = (b: BannerDTO): BannerForm => ({
  title: b.title,
  subtitle: b.subtitle || '',
  imageUrl: b.imageUrl || '',
  linkUrl: b.linkUrl || '',
  sortOrder: String(b.sortOrder),
  isActive: b.isActive,
});

export default function BannersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BannerDTO | null>(null);
  const [form, setForm] = useState<BannerForm>(blank);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({ queryKey: ['admin-banners'], queryFn: () => get<BannerDTO[]>('/admin/banners') });

  const saveM = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      return editing ? put(`/admin/banners/${editing.id}`, body) : post('/admin/banners', body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu banner.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      setOpen(false);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const toggleM = useMutation({
    mutationFn: (b: BannerDTO) => put(`/admin/banners/${b.id}`, { isActive: !b.isActive }),
    onSuccess: () => {
      toast('Đã đổi trạng thái hiển thị.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const rmM = useMutation({
    mutationFn: (id: number) => del(`/admin/banners/${id}`),
    onSuccess: (r) => {
      toast(r.message || 'Đã xóa banner.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadFile(file);
      setForm((f) => ({ ...f, imageUrl: r.url }));
      toast('Đã tải ảnh lên.', 'ok');
    } catch (e) {
      toast(errMessage(e, 'Không tải được ảnh.'), 'err');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const banners = q.data || [];

  return (
    <>
      <PageTitle title="Banner trang chủ"
        action={<button className="btn btn-gold btn-sm" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>+ Thêm banner</button>} />

      {q.isLoading ? <Loading text="Đang lấy danh sách banner..." /> : banners.length === 0 ? (
        <Empty title="Chưa có banner nào" children={<p className="small muted">Thêm banner để trình bày khuyến mãi, bộ sưu tập theo mùa trên trang chủ.</p>} />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Ảnh</th><th>Tiêu đề / liên kết</th><th>Sắp xếp</th><th>Hiển thị</th><th></th></tr></thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td style={{ width: 140 }}>
                    <img src={imageUrl(b.imageUrl, b.title)} alt={b.title} style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, background: 'var(--cream-2)' }} />
                  </td>
                  <td>
                    <b>{b.title}</b>
                    <div className="small muted">{b.subtitle || '—'}</div>
                    <div className="small muted">{b.linkUrl || 'Không có link'}</div>
                  </td>
                  <td>{b.sortOrder}</td>
                  <td>{b.isActive
                    ? <FlexTag color="#1e8e5a">Đang hiện</FlexTag>
                    : <FlexTag color="#8a6d55">Đã ẩn</FlexTag>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditing(b); setForm(toForm(b)); setOpen(true); }}>Sửa</button>
                    <button className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} disabled={toggleM.isPending} onClick={() => toggleM.mutate(b)}>
                      {b.isActive ? 'Ẩn' : 'Hiện'}
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }}
                      onClick={() => { if (window.confirm(`Xóa banner "${b.title}"?`)) rmM.mutate(b.id); }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={editing ? `Sửa banner: ${editing.title}` : 'Thêm banner'} onClose={() => setOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
          <div className="field">
            <label>Tiêu đề (2–120 ký tự)</label>
            <input className="input" required minLength={2} maxLength={120} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Phụ đề (không bắt buộc, tối đa 200 ký tự)</label>
            <input className="input" maxLength={200} value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <div className="field">
            <label>Ảnh banner</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <img src={imageUrl(form.imageUrl, form.title || 'Banner')} alt="Xem trước"
                style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 8, background: 'var(--cream-2)' }} />
              <input ref={fileRef} type="file" accept="image/*" style={{ flex: 1 }} disabled={uploading}
                onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
            <input className="input" style={{ marginTop: 8 }} placeholder="Hoặc dán đường dẫn ảnh" value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div className="field">
            <label>Liên kết khi bấm (không bắt buộc, ví dụ /banh)</label>
            <input className="input" maxLength={300} value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          </div>
          <div className="field">
            <label>Thứ tự hiển thị (0–999)</label>
            <input className="input" type="number" min={0} max={999} value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
          <label className="check-row mb-16">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Hiển thị trên trang chủ
          </label>
          <button className="btn btn-primary" disabled={saveM.isPending || uploading}>{saveM.isPending ? 'Đang lưu...' : 'Lưu banner'}</button>
        </form>
      </Modal>
    </>
  );
}
