/** Trang hoàn tất thanh toán: một khối duy nhất với QR PayOS, tiền về là tự về trạng thái đơn. */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { OrderDTO, StoreSettingsDTO } from '@shared/types';
import { formatVND, formatDate } from '../lib/format';
import { get } from '../lib/api';
import { EmptyState, LoadingBlock, Reveal } from '../components/ui';
import { BankTransferCard } from '../components/BankTransferCard';
import { useToast } from '../hooks/toast';
import { useSeo } from '../lib/seo';

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [celebrating, setCelebrating] = useState(false);
  useSeo({ title: 'Hoàn tất thanh toán' });

  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: () => get<StoreSettingsDTO>('/settings'),
  });
  const orderQ = useQuery({
    queryKey: ['order', id],
    queryFn: () => get<OrderDTO>(`/orders/${id}`),
    refetchInterval: (q) => (q.state.data?.paymentStatus === 'PAID' ? false : 8000),
  });

  const o = orderQ.data;
  const s = settingsQ.data;
  const paid = o?.paymentStatus === 'PAID';

  useEffect(() => {
    if (!o) return;
    if (o.paymentMethod !== 'BANK_TRANSFER') {
      navigate(`/tai-khoan/don-hang/${id}`, { replace: true });
      return;
    }
    if (paid && !celebrating) {
      setCelebrating(true);
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast('Thanh toán thành công — đơn đã được gửi vào bếp.', 'ok');
    }
  }, [o, paid, id, navigate, celebrating, qc, toast]);

  useEffect(() => {
    if (!celebrating) return;
    const t = window.setTimeout(
      () => navigate(`/tai-khoan/don-hang/${id}?paid=1`, { replace: true }),
      1800,
    );
    return () => window.clearTimeout(t);
  }, [celebrating, id, navigate]);

  if (orderQ.isPending) return <LoadingBlock text="Đang chuẩn bị mã thanh toán..." />;
  if (!o) {
    return (
      <div className="container section">
        <EmptyState icon="🧾" title="Không tìm thấy đơn này">
          <p className="small muted">
            Đơn có thể vừa bị hủy, hoặc bạn đang mở bằng tài khoản khác.
          </p>
          <Link
            to="/tai-khoan/don-hang"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 10 }}
          >
            Về danh sách đơn
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (celebrating) {
    return (
      <div className="container pay-page">
        <Reveal from="scale" className="card pad pay-paid">
          <CheckCircle2 size={40} />
          <h1>Đã nhận đủ thanh toán</h1>
          <p className="muted">
            Đơn <b>{o.code}</b> — {formatVND(o.total)}. Tiệm đang đưa bánh vào bếp.
          </p>
          <p className="small faint">Đang đưa bạn về trang đơn hàng…</p>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container pay-page">
      <div className="pay-page__nav">
        <Link to="/gio-hang" className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Quay lại giỏ hàng
        </Link>
        <Link to={`/tai-khoan/don-hang/${o.id}`} className="pay-page__nav-alt">Xem trạng thái đơn</Link>
      </div>
      <Reveal from="soft" className="pay-page__head">
        <span className="eyebrow">Bước cuối</span>
        <h1>Thanh toán đơn {o.code}</h1>
        <p className="lede">
          <b>{formatVND(o.total)}</b> · nhận {formatDate(o.deliveryDate)} · {o.timeSlot} ·{' '}
          {o.recipientName}
        </p>
      </Reveal>

      <Reveal from="up" delay={60}>
        {!s ? (
          <div className="pay-card">
            <div className="pay-card__qr">
              <span className="skeleton pay-skel" />
            </div>
            <div className="pay-card__info">
              {[0, 1, 2].map((i) => (
                <span key={i} className="skeleton pay-skel-line" />
              ))}
            </div>
          </div>
        ) : s.payosEnabled ? (
          <BankTransferCard
            orderId={o.id}
            paid={false}
            onPaid={() => qc.invalidateQueries({ queryKey: ['order', id] })}
          />
        ) : (
          <BankTransferCard
            orderId={o.id}
            paid={false}
            manual={{
              bankName: s.bankName,
              accountNumber: s.bankAccountNumber,
              accountName: s.bankAccountName,
              amount: o.total,
              content: o.code,
            }}
          />
        )}
      </Reveal>

      <p className="tiny faint pay-page__foot">
        Chưa tiện chuyển ngay? Giỏ hàng vẫn còn nguyên và đơn được giữ ở trạng thái chờ thanh toán — bạn quay lại đây bất cứ lúc nào.
      </p>
    </div>
  );
}
