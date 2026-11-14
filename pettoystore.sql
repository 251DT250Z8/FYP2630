SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `pettoystore`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `pettoystore`;

-- --------------------------------------------------------
-- Table structure for `admsta`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admsta`;
CREATE TABLE `admsta` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `fname` VARCHAR(50) DEFAULT '',
  `lname` VARCHAR(50) DEFAULT '',
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'staff',
  `c.phone` VARCHAR(5) NOT NULL DEFAULT '+60',
  `phone` VARCHAR(20) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(50) DEFAULT '',
  `zip` VARCHAR(20) DEFAULT '',
  `state` VARCHAR(50) DEFAULT '',
  `country` VARCHAR(50) NOT NULL DEFAULT 'Malaysia',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admsta` (`fname`, `lname`, `email`, `password`, `role`, `phone`, `address`, `city`, `zip`, `state`, `country`) VALUES
('Store', 'Admin', 'admin@system.com', 'admin123', 'admin', NULL, NULL, '', '', '', 'Malaysia');

-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `fname` VARCHAR(50) DEFAULT '',
  `lname` VARCHAR(50) DEFAULT '',
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'customer',
  `c.phone` VARCHAR(5) NOT NULL DEFAULT '+60',
  `phone` VARCHAR(20) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(50) DEFAULT '',
  `zip` VARCHAR(20) DEFAULT '',
  `state` VARCHAR(50) DEFAULT '',
  `country` VARCHAR(50) NOT NULL DEFAULT 'Malaysia',
  `cart` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `product`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `product`;
CREATE TABLE `product` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `stock` INT(11) NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `category_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_category_id` (`category_id`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `orders`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `paymentName` VARCHAR(100) DEFAULT '',
  `fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `shipping_name` VARCHAR(100) DEFAULT '',
  `shipping_phone` VARCHAR(20) DEFAULT '',
  `shipping_addr` TEXT DEFAULT NULL,
  `shipping_city` VARCHAR(50) DEFAULT '',
  `shipping_zip` VARCHAR(20) DEFAULT '',
  `shipping_state` VARCHAR(50) DEFAULT '',
  `shipping_country` VARCHAR(50) NOT NULL DEFAULT 'Malaysia',
  `pickup_time` TIME DEFAULT NULL,
  `pickup_date` DATE DEFAULT NULL,
  `user_id` INT(11) NOT NULL,
  `items` LONGTEXT DEFAULT NULL,
  `tracking_num` VARCHAR(100) DEFAULT NULL,
  `courier` VARCHAR(100) NOT NULL DEFAULT 'J&T Express',
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `order_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `quantity` INT(11) NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `order_id` INT(11) NOT NULL,
  `product_id` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `comments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) DEFAULT '',
  `body` TEXT DEFAULT NULL,
  `rating` TINYINT(1) NOT NULL DEFAULT 5,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` INT(11) NOT NULL,
  `product_id` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comments_user_id` (`user_id`),
  KEY `idx_comments_product_id` (`product_id`),
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comments_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
