/** Lưới an toàn: bắt lỗi render của cả trang, hiển thị thẻ lỗi lịch sự thay vì màn trắng */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Home, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Nini] Lỗi giao diện:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="container" style={{ paddingBlock: '80px 100px' }}>
        <div className="card empty-state" style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="empty-icon">🫖</div>
          <h3>Trà đổ mất rồi…</h3>
          <p className="muted small">
            Trang gặp sự cố hiển thị ngoài ý muốn. Bạn thử tải lại nhé — giỏ hàng vẫn được giữ nguyên.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              <RotateCcw size={15} /> Tải lại trang
            </button>
            <Link className="btn btn-ghost" to="/" onClick={() => this.setState({ hasError: false })}>
              <Home size={15} /> Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
