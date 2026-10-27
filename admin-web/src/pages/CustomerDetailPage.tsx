/** Hồ sơ khách hàng: thông tin + thống kê mua sắm + 8 đơn gần nhất + khóa/mở tài khoản */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { ProfileStatsDTO, PublicUserDTO } from '@shared/types';
import type { OrderStatus } from '@shared';
import { ORDER_STATUS_LABEL } from '@shared';
import { get, patch, errMessage } from '../lib/api';
import { formatVND, formatDate } from '../lib/format';
import { Loading, PageTitle, Empty } from '../components/ui';
import { StatusTag, FlexTag } from '../components/bits';
import { useToast } from '../hooks/toast';
import { useAdminAuth } from '../hooks/auth';

interface Detail {
  user: PublicUserDTO;
  stats: ProfileStatsDTO;
  orders: Array<{ id: number; code: string; status: OrderStatus; total: number; createdAt: string }>;
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();
  const customerId = Number(id);

  const q = useQuery({
    queryKey: ['admin-customer', customerId],
    queryFn: () => get<Detail>('/admin/users/detail/' + customerId),
    enabled: Number.isFinite(customerId) && customerId > 0,
  });

  const blockM = useMutation({
    mutationFn: (blocked: boolean) => patch(`/admin/users/${customerId}/block`, { blocked }),
    onSuccess: (r) => {
      toast(r.message || 'Đã cập nhật tài khoản.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-customer', customerId] });
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  if (q.isLoading) return <Loading text="Đang mở hồ sơ khách..." />;
  if (q.isError || !q.data) return <Empty title="Không tìm thấy khách hàng" children={<Link to="/customers" className="btn btn-outline btn-sm">← Về danh sách</Link>} />;

  const { user, stats, orders } = q.data;

  return (
    <>
      <PageTitle title={`Hồ sơ: ${user.fullName}`} action={<Link to="/customers" className="btn btn-outline btn-sm">← Danh sách khách</Link>} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 14, alignItems: 'start' }}>
        <div className="card pad">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.fullName} style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover' }} />
              : <span style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--champagne)', color: '#4a3a2a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
                  {user.fullName?.[0] || '?'}
                </span>}
            <div>
              <b style={{ fontSize: 17 }}>{user.fullName}</b>
              <div className="small muted">{user.role === 'CUSTOMER' ? 'Khách hàng' : user.role}</div>
            </div>
          </div>
          <p className="small" style={{ margin: '4px 0' }}>✉️ {user.email}</p>
          <p className="small" style={{ margin: '4px 0' }}>📞 {user.phone || 'Chưa có số điện thoại'}</p>
          <p style={{ margin: '10px 0 14px' }}>
            {user.status === 'BLOCKED'
              ? <FlexTag color="#c0392b">Đã khóa — không thể đăng nhập</FlexTag>
              : <FlexTag color="#1e8e5a">Đang hoạt động</FlexTag>}
          </p>

          <div style={{ borderTop: '1px dashed var(--line-2)', paddingTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Mua sắm</h3>
            <p className="small" style={{ margin: '4px 0' }}>Số đơn đã đặt: <b>{stats.orderCount}</b></p>
            <p className="small" style={{ margin: '4px 0' }}>Tổng chi (đơn hoàn tất): <b>{formatVND(stats.totalSpent)}</b></p>
          </div>

          <div style={{ marginTop: 16 }}>
            {isAdmin && user.status === 'BLOCKED' && (
              <button className="btn btn-outline btn-sm" disabled={blockM.isPending} onClick={() => blockM.mutate(false)}>Mở khóa tài khoản</button>
            )}
            {isAdmin && user.status === 'ACTIVE' && (
              <button className="btn btn-danger btn-sm" disabled={blockM.isPending}
                onClick={() => { if (window.confirm(`Khóa tài khoản "${user.fullName}"?`)) blockM.mutate(true); }}>Khóa tài khoản</button>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>Đơn hàng gần nhất</h3>
          {orders.length === 0 ? <Empty title="Khách chưa đặt đơn nào" /> : (
            <div className="card table-wrap">
              <table className="table">
                <thead><tr><th>Mã đơn</th><th>Trạng thái</th><th className="right">Tổng tiền</th><th className="right">Ngày đặt</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link to={`/orders/${o.id}`} style={{ fontWeight: 700, color: 'var(--cocoa)' }}>#{o.code}</Link></td>
                      <td><StatusTag status={o.status} /></td>
                      <td className="right" style={{ fontWeight: 700 }}>{formatVND(o.total)}</td>
                      <td className="right small">
                        {formatDate(o.createdAt)}
                        <div className="small muted">{ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL]}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link className="btn btn-outline btn-sm" style={{ marginTop: 10 }} to={`/orders?search=${encodeURIComponent(user.email)}`}>
            Tìm tất cả đơn theo email →
          </Link>
        </div>
      </div>
    </>
  );
}
