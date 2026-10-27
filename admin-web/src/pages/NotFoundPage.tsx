/** Trang 404 của khu quản trị */
import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="container">
      <Empty title="Không có mục này trong bàn làm việc">
        <Link to="/" className="btn btn-outline btn-sm">Về tổng quan</Link>
      </Empty>
    </div>
  );
}
