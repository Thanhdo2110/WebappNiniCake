/** Danh mục bánh: CRUD (admin) */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { CategoryAdminDTO } from '@shared/types';
import { get, post, put, del, errMessage } from '../lib/api';
import { Loading, PageTitle, Empty, Modal } from '../components/ui';
import { useToast } from '../hooks/toast';

interface Form { name: string; description: string; sortOrder: string; isActive: boolean }
const blank: Form = { name: '', description: '', sortOrder: '0', isActive: true };

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAdminDTO | null>(null);
  const [form, setForm] = useState<Form>(blank);

  const q = useQuery({ queryKey: ['admin-categories'], queryFn: () => get<CategoryAdminDTO[]>('/admin/categories') });

  const saveM = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      return editing ? put(`/admin/categories/${editing.id}`, body) : post('/admin/categories', body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu danh mục.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setOpen(false);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const rmM = useMutation({
    mutationFn: (id: number) => del(`/admin/categories/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa danh mục.', 'ok'); qc.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (c: CategoryAdminDTO) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '', sortOrder: String(c.sortOrder), isActive: c.isActive });
    setOpen(true);
  };

  return (
    <>
      <PageTitle title="Danh mục bánh" action={<button className="btn btn-gold btn-sm" onClick={openNew}>+ Thêm danh mục</button>} />
      {q.isLoading ? <Loading text="Đang mở danh mục..." /> : (q.data || []).length === 0 ? (
        <Empty title="Chưa có danh mục nào" />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Tên</th><th>Số bánh</th><th>Sắp xếp</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {(q.data || []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                    <div className="small muted">{c.slug}{c.description ? ` — ${c.description}` : ''}</div>
                  </td>
                  <td>{c.productCount}</td>
                  <td>{c.sortOrder}</td>
                  <td><span className={`tag ${c.isActive ? 'tag-green' : 'tag-gray'}`}>{c.isActive ? 'Hiện' : 'Ẩn'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Sửa</button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }}
                      onClick={() => { if (window.confirm(`Xóa danh mục "${c.name}"?`)) rmM.mutate(c.id); }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={editing ? `Sửa danh mục: ${editing.name}` : 'Thêm danh mục'} onClose={() => setOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
          <div className="field">
            <label>Tên danh mục (2–60 ký tự)</label>
            <input className="input" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Mô tả (không bắt buộc)</label>
            <textarea className="textarea" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Thứ tự sắp (0–999)</label>
            <input className="input" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
          <label className="check-row mb-16">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Hiển thị cho khách
          </label>
          <button className="btn btn-primary" disabled={saveM.isPending}>{saveM.isPending ? 'Đang lưu...' : 'Lưu'}</button>
        </form>
      </Modal>
    </>
  );
}
