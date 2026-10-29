-- Cột cất thông tin nhà cung cấp thanh toán (PayOS: paymentLinkId, số tài khoản ảo, URL QR/checkout)
-- để khách tải lại trang vẫn thấy đúng mã QR của link đã tạo.
ALTER TABLE `payments` ADD COLUMN `providerMeta` JSON NULL;
