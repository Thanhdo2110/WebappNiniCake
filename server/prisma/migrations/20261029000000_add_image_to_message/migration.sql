-- Khách gửi tin nhắn liên hệ có thể đính kèm ảnh bánh muốn đặt
ALTER TABLE `messages`
    ADD COLUMN `imageUrl` VARCHAR(500) NULL;
