/** Nhân viên: danh sách tài khoản STAFF + tạo tài khoản ADMIN/STAFF (chỉ ADMIN) */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Paginated, PublicUserDTO } from '@shared/types';
import { get, patch, post, errMessage } from '../lib/api';
import { Loading, PageTitle, Empty, Pager, Modal } from '../components/ui';
import { FlexTag } from '../components/bits';
import { useToast } from '../hooks/toast';

type Row = PublicUserDTO & { orderCount: number };

interface StaffForm { fullName: string; email: string; password: string; role: 'STAFF' | 'ADMIN' }
const blank: StaffForm = { fullName: '', email: '', password: '', role: 'STAFF' };

export default function StaffPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StaffForm>(blank);

  const q = useQuery({
    queryKey: ['admin-staff', { search, page }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, perPage: 12 };
      if (search.trim()) params.q = search.trim();
      return get<Paginated<Row>>('/admin/users/STAFF', params);
    },
  });

  const createM = useMutation({
    mutationFn: () => post('/admin/staff', {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
    }),
    onSuccess: (r) => {
      toast(r.message || 'Đã tạo tài khoản.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      setOpen(false);
      setForm(blank);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const blockM = useMutation({
    mutationFn: (p: { id: number; blocked: boolean }) => patch(`/admin/users/${p.id}/block`, { blocked: p.blocked }),
    onSuccess: (r) => {
      toast(r.message || 'Đã cập nhật tài khoản.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = q.data?.items || [];

  return (
    <>
      <PageTitle title="Nhân viên"
        action={<button className="btn btn-gold btn-sm" onClick={() => { setForm(blank); setOpen(true); }}>+ Tạo tài khoản</button>} />

      <div className="filter-bar card pad">
        <input className="input" placeholder="Tên / email nhân viên" value={search} style={{ minWidth: 260 }}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {q.isLoading ? <Loading text="Đang lấy danh sách nhân viên..." /> : items.length === 0 ? (
        <Empty title="Chưa có nhân viên nào" children={<p className="small muted">Dùng nút “Tạo tài khoản” để thêm nhân viên hoặc quản trị viên.</p>} />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.fullName}</b>
                      <div className="small muted">{u.email}</div>
                    </td>
                    <td>{u.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</td>
                    <td>{u.status === 'BLOCKED'
                      ? <FlexTag color="#c0392b">Đã khóa</FlexTag>
                      : <FlexTag color="#1e8e5a">Hoạt động</FlexTag>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {u.role !== 'ADMIN' && (u.status === 'ACTIVE' ? (
                        <button className="btn btn-danger btn-sm" disabled={blockM.isPending}
                          onClick={() => { if (window.confirm(`Khóa tài khoản "${u.fullName}"?`)) blockM.mutate({ id: u.id, blocked: true }); }}>
                          Khóa
                        </button>
                      ) : (
                        <button className="btn btn-outline btn-sm" disabled={blockM.isPending}
                          onClick={() => blockM.mutate({ id: u.id, blocked: false })}>Mở khóa</button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} page={page} onPage={setPage} />}
        </>
      )}

      <Modal open={open} title="Tạo tài khoản quản trị" onClose={() => setOpen(false)} width={560}>
        <form onSubmit={(e) => { e.preventDefault(); createM.mutate(); }}>
          <div className="field">
            <label>Họ và tên (2–80 ký tự)</label>
            <input className="input" required minLength={2} maxLength={80} value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="field">
            <label>Email đăng nhập</label>
            <input className="input" type="email" required maxLength={120} value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Mật khẩu (tối thiểu 8 ký tự)</label>
            <input className="input" type="password" required minLength={8} maxLength={72} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="field">
            <label>Vai trò</label>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'STAFF' | 'ADMIN' })}>
              <option value="STAFF">Nhân viên (STAFF)</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={createM.isPending}>{createM.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
        </form>
      </Modal>
    </>
  );
}
