/** Tin nhắn liên hệ từ khách: xem, đánh dấu đã đọc, xuất danh sách email nhận tin */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Paginated, MessageDTO } from '@shared/types';
import { get, patch, errMessage } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { formatDateTime } from '../lib/format';
import { Loading, PageTitle, Empty, Pager, Modal } from '../components/ui';
import { FlexTag } from '../components/bits';
import { useToast } from '../hooks/toast';

export default function MessagesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<MessageDTO | null>(null);
  const [exporting, setExporting] = useState(false);

  const q = useQuery({
    queryKey: ['admin-messages', page],
    queryFn: () => get<Paginated<MessageDTO>>('/admin/messages', { page, perPage: 15 }),
  });

  const readM = useMutation({
    mutationFn: (id: number) => patch(`/admin/messages/${id}/read`),
    onSuccess: (r) => {
      toast(r.message || 'Đã đánh dấu đã đọc.', 'ok');
      setViewing(null);
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const exportM = async () => {
    setExporting(true);
    try {
      await downloadCsv('/admin/newsletter.csv', 'nini-newsletter.csv');
      toast('Đã tải file danh sách email nhận tin.', 'ok');
    } catch (e) {
      toast(errMessage(e, 'Không tải được file.'), 'err');
    } finally {
      setExporting(false);
    }
  };

  const items = q.data?.items || [];

  return (
    <>
      <PageTitle title="Tin nhắn & email nhận tin"
        action={<button className="btn btn-outline btn-sm" disabled={exporting} onClick={exportM}>⬇ CSV email nhận tin</button>} />

      {q.isLoading ? <Loading text="Đang mở hộp thư..." /> : items.length === 0 ? (
        <Empty title="Chưa có tin nhắn nào" children={<p className="small muted">Tin nhắn từ mục “Liên hệ” trên cửa hàng sẽ về đây.</p>} />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Người gửi</th><th>Nội dung</th><th>Trạng thái</th><th>Thời gian</th><th></th></tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} style={{ fontWeight: m.isRead ? 400 : 700 }}>
                    <td>
                      {m.name}
                      <div className="small muted" style={{ fontWeight: 400 }}>{m.email}{m.phone ? ` • ${m.phone}` : ''}</div>
                    </td>
                    <td className="small" style={{ maxWidth: 360 }}>
                      <b style={{ fontWeight: m.isRead ? 600 : 800 }}>{m.subject || '(Không có chủ đề)'}</b>
                      <div className="muted" style={{ maxHeight: 36, overflow: 'hidden' }}>{m.content}</div>
                    </td>
                    <td>{m.isRead
                      ? <FlexTag color="#8a6d55">Đã đọc</FlexTag>
                      : <FlexTag color="#c0392b">Chưa đọc</FlexTag>}
                    </td>
                    <td className="small" style={{ fontWeight: 400 }}>{formatDateTime(m.createdAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setViewing(m)}>Xem</button>
                      {!m.isRead && (
                        <button className="btn btn-primary btn-sm" style={{ marginLeft: 6 }} disabled={readM.isPending}
                          onClick={() => readM.mutate(m.id)}>Đánh dấu đọc</button>
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

      <Modal open={viewing !== null} title={viewing?.subject || 'Tin nhắn từ khách'} onClose={() => setViewing(null)} width={640}>
        {viewing && (
          <>
            <p className="small muted" style={{ marginTop: -6 }}>
              {viewing.name} • {viewing.email}{viewing.phone ? ` • ${viewing.phone}` : ''} • {formatDateTime(viewing.createdAt)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap', background: 'var(--cream-2)', padding: 14, borderRadius: 10 }}>{viewing.content}</p>
            {!viewing.isRead && (
              <button className="btn btn-primary" disabled={readM.isPending} onClick={() => readM.mutate(viewing.id)}>
                Đánh dấu đã đọc
              </button>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
