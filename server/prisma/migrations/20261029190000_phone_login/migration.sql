-- Đăng ký bằng số điện thoại: email không còn bắt buộc với khách hàng,
-- số điện thoại trở thành khóa đăng nhập nên phải unique.

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(190) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`);
