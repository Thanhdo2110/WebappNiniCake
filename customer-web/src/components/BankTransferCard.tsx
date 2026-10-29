/** Thẻ chuyển khoản: một mã QR duy nhất (nội dung EMVCo PayOS trả về), thông tin gọn,
    trạng thái "đã thanh toán" luôn do server quyết — khách không tự đánh dấu được. */
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Landmark, RefreshCw } from 'lucide-react';
import { formatVND } from '../lib/format';
import { post, errMessage } from '../lib/api';

export interface PayosView {
  enabled: boolean;
  status: string;
  paid: boolean;
  amount: number;
  accountName: string;
  accountNumber: string;
  bin: string;
  content: string;
  qrContent: string;
  qrDataUrl: string;
  checkoutUrl: string;
}

export type ManualTransfer = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
};

const group4 = (v: string) => (v || '').replace(/(.{4})(?=.)/g, '$1 ');

export function BankTransferCard({
  orderId,
  paid,
  onPaid,
  manual,
}: {
  orderId: number;
  paid: boolean;
  onPaid?: () => void;
  manual?: ManualTransfer;
}) {
  const [view, setView] = useState<PayosView | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  const paidCb = useRef(onPaid);
  useEffect(() => {
    paidCb.current = onPaid;
  }, [onPaid]);

  /* PayOS: xin link — idempotent, link cũ còn hiệu lực sẽ được trả về */
  useEffect(() => {
    if (manual || paid) return;
    let alive = true;
    post<PayosView>(`/orders/${orderId}/payments`)
      .then((r) => alive && setView(r.data))
      .catch((e) => alive && setError(errMessage(e, 'Chưa lấy được mã thanh toán.')));
    return () => {
      alive = false;
    };
  }, [manual, paid, orderId, nonce]);

  /* Trang này tự đối soát định kỳ, không phụ thuộc khách bấm nút hay IPN */
  useEffect(() => {
    if (manual || paid || !view || view.paid) return;
    const timer = window.setInterval(() => {
      post<PayosView>(`/orders/${orderId}/payments/sync`)
        .then((r) => {
          setView(r.data);
          if (r.data.paid) paidCb.current?.();
        })
        .catch(() => {
          /* lần sau thử lại */
        });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [manual, paid, view, orderId]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setError('Trình duyệt chặn sao chép — bạn chọn thủ công rồi bấm Ctrl+C nhé.');
    }
  };

  const recheck = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await post<PayosView>(`/orders/${orderId}/payments/sync`);
      setView(data);
      if (data.paid) onPaid?.();
      else setError('Vẫn chưa thấy tiền về. Nếu bạn vừa chuyển, ngân hàng có thể chậm vài phút.');
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <p className="pay-ok">
        <Check size={16} /> <b>Đã nhận đủ thanh toán.</b> Tiệm đang chuẩn bị bánh.
      </p>
    );
  }

  const Line = ({ k, v, raw, big }: { k: string; v: string; raw?: string; big?: boolean }) => (
    <div className="pay-line">
      <span className="pay-line__k">{k}</span>
      <span className={'pay-line__v' + (big ? ' pay-line__v--big' : '')}>{v}</span>
      {raw !== undefined && (
        <button
          type="button"
          className="pay-line__copy"
          onClick={() => copy(k, raw)}
          aria-label={`Sao chép ${k.toLowerCase()}`}
        >
          {copied === k ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );

  /* ----- Thủ công: tiệm chưa bật cổng thanh toán ----- */
  if (manual) {
    return (
      <div className="pay-card">
        <div className="pay-card__brand">
          <Landmark size={15} /> {manual.bankName}
        </div>
        <div className="pay-card__info pay-card__info--single">
          <Line k="Số tài khoản" v={group4(manual.accountNumber)} raw={manual.accountNumber} big />
          <Line k="Chủ tài khoản" v={manual.accountName} />
          <Line k="Số tiền" v={formatVND(manual.amount)} raw={String(manual.amount)} big />
          <Line k="Nội dung chuyển khoản" v={manual.content} raw={manual.content} big />
        </div>
        {error && (
          <p className="pay-err" role="alert">
            {error}
          </p>
        )}
        <p className="pay-foot-note">
          Chuyển đúng nội dung trên để tiệm ghép được với đơn. Đơn vẫn được giữ nếu bạn chuyển muộn.
        </p>
      </div>
    );
  }

  /* ----- PayOS ----- */
  if (!view) {
    return error ? (
      <div className="pay-card pay-card--error">
        <p className="pay-err" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setNonce((n) => n + 1)}
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    ) : (
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
    );
  }

  return (
    <div className="pay-card">
      <div className="pay-card__qr">
        {view.qrDataUrl ? (
          <img
            src={view.qrDataUrl}
            alt={`Mã VietQR thanh toán nội dung ${view.content}`}
            width={232}
            height={232}
          />
        ) : (
          <span className="skeleton pay-skel" />
        )}
        <span className="pay-card__brand">
          <Landmark size={15} /> {view.accountName}
        </span>
        <span className="pay-card__hint">
          Quét bằng app ngân hàng bất kỳ — tự điền đủ tiền và nội dung
        </span>
      </div>

      <div className="pay-card__info">
        <Line k="Số tiền" v={formatVND(view.amount)} raw={String(view.amount)} big />
        <Line k="Nội dung chuyển khoản" v={view.content} raw={view.content} big />
        <Line k="Số tài khoản nhận" v={view.accountNumber} raw={view.accountNumber} />

        {error && (
          <p className="pay-err" role="alert">
            {error}
          </p>
        )}

        <div className="pay-actions">
          <button type="button" className="btn btn-gold btn-sm" onClick={recheck} disabled={busy}>
            <RefreshCw size={14} /> {busy ? 'Đang kiểm tra…' : 'Tôi đã chuyển xong'}
          </button>
        </div>
      </div>
    </div>
  );
}
