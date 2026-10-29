/** Danh sách khách hàng: tra cứu + khóa tài khoản (chỉ ADMIN mới khóa được) */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Paginated, PublicUserDTO } from '@shared/types';
import { get, patch, errMessage } from '../lib/api';
import { Loading, PageTitle, Empty, Pager } from '../components/ui';
import { FlexTag } from '../components/bits';
import { useToast } from '../hooks/toast';
import { useAdminAuth } from '../hooks/auth';

type Row = PublicUserDTO & { orderCount: number };

export default function CustomersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['admin-customers', { search, page }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, perPage: 12 };
      if (search.trim()) params.q = search.trim();
      return get<Paginated<Row>>('/admin/users/CUSTOMER', params);
    },
  });

  const blockM = useMutation({
    mutationFn: (p: { id: number; blocked: boolean }) => patch(`/admin/users/${p.id}/block`, { blocked: p.blocked }),
    onSuccess: (r) => {
      toast(r.message || 'Đã cập nhật tài khoản.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      qc.removeQueries({ queryKey: ['admin-customer'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = q.data?.items || [];
  const total = q.data?.meta.totalItems ?? 0;

  return (
    <>
      <PageTitle title="Khách hàng" action={total > 0 ? <span className="small muted">{total} khách hàng</span> : undefined} />

      <div className="filter-bar card pad">
        <input className="input" placeholder="Tên / email / SĐT khách" value={search} style={{ minWidth: 260 }}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {q.isLoading ? <Loading text="Đang mở sổ khách..." /> : items.length === 0 ? (
        <Empty title="Chưa có khách hàng nào" />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Đơn đã đặt</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b><Link to={`/customers/${u.id}`} style={{ color: 'var(--cocoa)' }}>{u.fullName}</Link></b>
                      <div className="small muted">{u.email || '—'}</div>
                    </td>
                    <td className="small">{u.phone || '—'}</td>
                    <td>{u.orderCount}</td>
                    <td>{u.status === 'BLOCKED'
                      ? <FlexTag color="#c0392b">Đã khóa</FlexTag>
                      : <FlexTag color="#1e8e5a">Hoạt động</FlexTag>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-outline btn-sm" to={`/customers/${u.id}`}>Chi tiết</Link>
                      {isAdmin && u.status === 'ACTIVE' && (
                        <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} disabled={blockM.isPending}
                          onClick={() => { if (window.confirm(`Khóa tài khoản "${u.fullName}"? Khách sẽ không thể đăng nhập.`)) blockM.mutate({ id: u.id, blocked: true }); }}>
                          Khóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} page={page} onPage={setPage} />}
        </>
      )}
    </>
  );
}
