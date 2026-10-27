-- Thêm thông tin định vị Google Maps cho địa chỉ và đơn hàng
ALTER TABLE `addresses`
    ADD COLUMN `lat` DOUBLE NULL,
    ADD COLUMN `lng` DOUBLE NULL,
    ADD COLUMN `mapsUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `lat` DOUBLE NULL,
    ADD COLUMN `lng` DOUBLE NULL,
    ADD COLUMN `mapsUrl` VARCHAR(500) NULL;
