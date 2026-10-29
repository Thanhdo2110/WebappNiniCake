/** Cuộn về đầu trang + đặt tiêu đề tài liệu khi đổi route */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    /* 'auto' sẽ ăn theo `scroll-behavior: smooth` của html → cuộn animation
       mỗi lần đổi trang và dễ dừng giữa chừng khi nội dung kịp render */
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
