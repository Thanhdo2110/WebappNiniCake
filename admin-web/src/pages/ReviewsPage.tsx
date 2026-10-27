/** Duyệt / ẩn / trả lời / xóa đánh giá + lọc theo trạng thái duyệt */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Paginated, ReviewDTO } from '@shared/types';
import { get, patch, del, errMessage } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { Loading, PageTitle, Empty, Pager, Modal } from '../components/ui';
import { useToast } from '../hooks/toast';

type AdminReviewRow = Omit<ReviewDTO, 'user'> & {
  user: { id: number; fullName: string; email: string } | null;
  product: { name?: string } | null;
  isApproved: boolean;
  isHidden: boolean;
  productId: number;
};

export default function ReviewsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [approved, setApproved] = useState('');
  const [page, setPage] = useState(1);
  const [replyTo, setReplyTo] = useState<AdminReviewRow | null>(null);
  const [reply, setReply] = useState('');

  const q = useQuery({
    queryKey: ['admin-reviews', { approved, page }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, perPage: 12 };
      if (approved !== '') params.approved = approved;
      return get<Paginated<AdminReviewRow>>('/admin/reviews', params);
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const approveM = useMutation({
    mutationFn: (p: { row: AdminReviewRow; approve: boolean }) =>
      patch(`/admin/reviews/${p.row.id}/approve`, { approve: p.approve }),
    onSuccess: (r) => { toast(r.message || 'Đã cập nhật duyệt.', 'ok'); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const hideM = useMutation({
    mutationFn: (p: { row: AdminReviewRow; hide: boolean }) =>
      patch(`/admin/reviews/${p.row.id}/hide`, { hide: p.hide }),
    onSuccess: (r) => { toast(r.message || 'Đã cập nhật ẩn.', 'ok'); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const replyM = useMutation({
    mutationFn: (id: number) => patch(`/admin/reviews/${id}/reply`, { reply: reply.trim() }),
    onSuccess: (r) => { toast(r.message || 'Đã gửi phản hồi.', 'ok'); setReplyTo(null); setReply(''); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const rmM = useMutation({
    mutationFn: (id: number) => del(`/admin/reviews/${id}`),
    onSuccess: (r) => { toast(r.message || 'Đã xóa đánh giá.', 'ok'); refresh(); },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = q.data?.items || [];

  return (
    <>
      <PageTitle title="Đánh giá của khách" action={
        <select className="select" value={approved} onChange={(e) => { setApproved(e.target.value); setPage(1); }} style={{ width: 200 }}>
          <option value="">Tất cả duyệt/lẩn</option>
          <option value="true">Đã duyệt</option>
          <option value="false">Chờ duyệt</option>
        </select>
      } />

      {q.isLoading ? <Loading /> : items.length === 0 ? (
        <Empty title="Không có đánh giá nào trong mục này" />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Sao</th><th>Bánh</th><th>Khách</th><th>Nội dung</th><th>Tình trạng</th><th></th></tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                    <td className="small"><b>{(r.product as { name?: string } | null)?.name || `#${r.productId}`}</b></td>
                    <td className="small">{r.user ? <><b>{r.user.fullName}</b><div className="small muted">{r.user.email}</div></> : 'Khách rõ mặt'}</td>
                    <td style={{ maxWidth: 340 }}>
                      <div className="small">{r.comment || '—'}</div>
                      {r.reply && <div className="small" style={{ color: 'var(--ok)' }}>↳ {r.reply}</div>}
                      <div className="small muted">{formatDateTime(r.createdAt)}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`tag ${r.isApproved ? 'tag-green' : 'tag-warn'}`}>{r.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}</span>
                      {r.isHidden && <span className="tag tag-red" style={{ marginLeft: 4 }}>Đã ẩn</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.isApproved ? (
                        <button className="btn btn-outline btn-sm" onClick={() => approveM.mutate({ row: r, approve: false })}>Bỏ duyệt</button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => approveM.mutate({ row: r, approve: true })}>Duyệt</button>
                      )}
                      <button className="btn btn-outline btn-sm" style={{ marginLeft: 4 }}
                        onClick={() => { setReplyTo(r); setReply(r.reply || ''); }}>Trả lời</button>
                      {r.isHidden ? (
                        <button className="btn btn-outline btn-sm" style={{ marginLeft: 4 }} onClick={() => hideM.mutate({ row: r, hide: false })}>Hiện lại</button>
                      ) : (
                        <button className="btn btn-outline btn-sm" style={{ marginLeft: 4 }} onClick={() => hideM.mutate({ row: r, hide: true })}>Ẩn</button>
                      )}
                      <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }}
                        onClick={() => { if (window.confirm('Xóa hẳn đánh giá này?')) rmM.mutate(r.id); }}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} page={page} onPage={setPage} />}
        </>
      )}

      <Modal open={!!replyTo} title={`Phản hồi đánh giá của ${replyTo?.user?.fullName || 'khách'}`} onClose={() => setReplyTo(null)} width={560}>
        <form onSubmit={(e) => { e.preventDefault(); if (replyTo) replyM.mutate(replyTo.id); }}>
          <p className="small muted" style={{ marginTop: -6 }}>Nội dung hiện tại: {replyTo?.comment || '—'}</p>
          <div className="field">
            <label>{"Lời gửi đến khách (2–600 ký tự)"}</label>
            <textarea className="textarea" required minLength={2} maxLength={600} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={replyM.isPending}>{replyM.isPending ? 'Đang gửi...' : 'Gửi trả lời'}</button>
        </form>
      </Modal>
    </>
  );
}
