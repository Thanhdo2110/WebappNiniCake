/** Nguyên liệu & dị ứng: hai bảng trong một trang, gán dị ứng cho nguyên liệu */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AllergenDTO, IngredientDTO, CategoryDTO } from '@shared/types';
import { get, post, put, del, errMessage } from '../lib/api';
import { Loading, PageTitle, Empty, Modal } from '../components/ui';
import { useToast } from '../hooks/toast';

export default function IngredientsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const ingQ = useQuery({ queryKey: ['admin-ingredients'], queryFn: () => get<IngredientDTO[]>('/admin/ingredients') });
  const algQ = useQuery({ queryKey: ['admin-allergens'], queryFn: () => get<AllergenDTO[]>('/admin/allergens') });
  // Bảng danh mục lân cận không cần ở đây, nhưng giữ API thể hiện quyền staff
  useQuery({ queryKey: ['admin-cats-probe'], queryFn: () => get<CategoryDTO[]>('/admin/categories'), refetchOnMount: false });

  /* --- nguyên liệu --- */
  const [ingOpen, setIngOpen] = useState(false);
  const [ingEditing, setIngEditing] = useState<IngredientDTO | null>(null);
  const [ingForm, setIngForm] = useState<{ name: string; note: string; allergenIds: number[] }>({ name: '', note: '', allergenIds: [] });

  const ingSave = useMutation({
    mutationFn: () => {
      const body = { name: ingForm.name.trim(), note: ingForm.note.trim(), allergenIds: ingForm.allergenIds };
      return ingEditing ? put(`/admin/ingredients/${ingEditing.id}`, body) : post('/admin/ingredients', body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu nguyên liệu.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setIngOpen(false);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const ingRm = useMutation({
    mutationFn: (id: number) => del(`/admin/ingredients/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa nguyên liệu.', 'ok'); qc.invalidateQueries({ queryKey: ['admin-ingredients'] }); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  /* --- dị ứng --- */
  const [algOpen, setAlgOpen] = useState(false);
  const [algEditing, setAlgEditing] = useState<AllergenDTO | null>(null);
  const [algForm, setAlgForm] = useState<{ name: string; icon: string }>({ name: '', icon: '' });

  const algSave = useMutation({
    mutationFn: () => {
      const body = { name: algForm.name.trim(), icon: algForm.icon.trim() };
      return algEditing ? put(`/admin/allergens/${algEditing.id}`, body) : post('/admin/allergens', body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu dị ứng.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-allergens'] });
      setAlgOpen(false);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const algRm = useMutation({
    mutationFn: (id: number) => del(`/admin/allergens/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa dị ứng.', 'ok'); qc.invalidateQueries({ queryKey: ['admin-allergens'] }); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  return (
    <>
      <PageTitle title="Nguyên liệu & dị ứng" action={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-gold btn-sm" onClick={() => { setAlgEditing(null); setAlgForm({ name: '', icon: '' }); setAlgOpen(true); }}>+ Dị ứng</button>
          <button className="btn btn-gold btn-sm" onClick={() => { setIngEditing(null); setIngForm({ name: '', note: '', allergenIds: [] }); setIngOpen(true); }}>+ Nguyên liệu</button>
        </div>
      } />

      {ingQ.isLoading || algQ.isLoading ? <Loading /> : (
        <div className="card table-wrap mb-24">
          <h3 style={{ fontSize: 15, padding: '12px 14px 0' }}>Nguyên liệu</h3>
          <table className="table">
            <thead><tr><th>Tên</th><th>Ghi chú</th><th>Dị ứng gắn với</th><th></th></tr></thead>
            <tbody>
              {(ingQ.data || []).length === 0 && <tr><td colSpan={4}><Empty title="Chưa có nguyên liệu" /></td></tr>}
              {(ingQ.data || []).map((i) => (
                <tr key={i.id}>
                  <td><b>{i.name}</b></td>
                  <td className="small muted">{i.note || '—'}</td>
                  <td>{i.allergenIds.length ? i.allergenIds.map((id) => (algQ.data || []).find((a) => a.id === id)?.name || `#a${id}`).join(', ') : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm"
                      onClick={() => { setIngEditing(i); setIngForm({ name: i.name, note: i.note || '', allergenIds: [...i.allergenIds] }); setIngOpen(true); }}>Sửa</button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }}
                      onClick={() => { if (window.confirm(`Xóa nguyên liệu "${i.name}"?`)) ingRm.mutate(i.id); }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card table-wrap">
        <h3 style={{ fontSize: 15, padding: '12px 14px 0' }}>Nhóm dị ứng</h3>
        <table className="table">
          <thead><tr><th>Tên</th><th>Biểu tượng</th><th></th></tr></thead>
          <tbody>
            {(algQ.data || []).length === 0 && <tr><td colSpan={3}><Empty title="Chưa có nhóm dị ứng" /></td></tr>}
            {(algQ.data || []).map((a) => (
              <tr key={a.id}>
                <td><b>{a.name}</b></td>
                <td style={{ fontSize: 18 }}>{a.icon || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setAlgEditing(a); setAlgForm({ name: a.name, icon: a.icon || '' }); setAlgOpen(true); }}>Sửa</button>
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }}
                    onClick={() => { if (window.confirm(`Xóa nhóm dị ứng "${a.name}"?`)) algRm.mutate(a.id); }}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nguyên liệu */}
      <Modal open={ingOpen} title={ingEditing ? `Sửa nguyên liệu: ${ingEditing.name}` : 'Thêm nguyên liệu'} onClose={() => setIngOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); ingSave.mutate(); }}>
          <div className="field">
            <label>Tên nguyên liệu (2–60)</label>
            <input className="input" required minLength={2} maxLength={60} value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Ghi chú (200 ký tự)</label>
            <input className="input" maxLength={200} value={ingForm.note} onChange={(e) => setIngForm({ ...ingForm, note: e.target.value })} />
          </div>
          <div className="field">
            <label>Dị ứng trong nguyên liệu</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(algQ.data || []).map((a) => (
                <button key={a.id} type="button" className={`variant-pill ${ingForm.allergenIds.includes(a.id) ? 'selected' : ''}`}
                  onClick={() => setIngForm((f) => ({
                    ...f,
                    allergenIds: f.allergenIds.includes(a.id) ? f.allergenIds.filter((x) => x !== a.id) : [...f.allergenIds, a.id],
                  }))}>
                  {a.icon ? `${a.icon} ` : ''}{a.name}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" disabled={ingSave.isPending}>{ingSave.isPending ? 'Đang lưu...' : 'Lưu'}</button>
        </form>
      </Modal>

      {/* Modal dị ứng */}
      <Modal open={algOpen} title={algEditing ? `Sửa dị ứng: ${algEditing.name}` : 'Thêm nhóm dị ứng'} onClose={() => setAlgOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); algSave.mutate(); }}>
          <div className="field">
            <label>Tên dị ứng (VD: Lúa mì, Trứng, Sữa)</label>
            <input className="input" required minLength={2} maxLength={60} value={algForm.name} onChange={(e) => setAlgForm({ ...algForm, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Biểu tượng (1–10 ký tự, emoji tùy chọn)</label>
            <input className="input" maxLength={10} value={algForm.icon} placeholder="🌾" onChange={(e) => setAlgForm({ ...algForm, icon: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={algSave.isPending}>{algSave.isPending ? 'Đang lưu...' : 'Lưu'}</button>
        </form>
      </Modal>
    </>
  );
}
