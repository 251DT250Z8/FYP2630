SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create and Select Database
CREATE DATABASE IF NOT EXISTS `geckostore` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `geckostore`;

-- 2. Drop Obsolete / Redundant Tables
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

-- ----------------------------------------------------------------------------
-- TABLE: roles (Role-Based Access Control / RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(50) UNIQUE NOT NULL,
  `description` varchar(255) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Standard Roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'admin', 'System Administrator with full access to reports, users, products, and orders'),
(2, 'staff', 'Vivarium Staff managing inventory, restock, and in-store pickup orders'),
(3, 'customer', 'Registered Retail Customer browsing reptiles, scheduling pickups, and placing orders');

-- ----------------------------------------------------------------------------
-- TABLE: users
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(100) UNIQUE NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL DEFAULT 3,
  `role` varchar(20) NOT NULL DEFAULT 'customer',
  `firstName` varchar(50) DEFAULT '',
  `lastName` varchar(50) DEFAULT '',
  `phoneExt` varchar(10) DEFAULT '+60',
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT '',
  `state` varchar(50) DEFAULT '',
  `zip` varchar(20) DEFAULT '',
  `country` varchar(50) DEFAULT 'Malaysia',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE,
  INDEX `idx_users_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Test Accounts (matches system test default.txt)
INSERT INTO `users` (`id`, `email`, `password`, `role_id`, `role`, `firstName`, `lastName`) VALUES
(1, 'admin@reptilestore.com', 'admin123', 1, 'admin', 'Store', 'Admin'),
(2, 'staff@reptilestore.com', 'staff123', 2, 'staff', 'Vivarium', 'Staff'),
(3, 'customer@reptilestore.com', 'password123', 3, 'customer', 'Reptile', 'Shopper'),
(4, 'admin@system.com', 'admin123', 1, 'admin', 'Admin', ''),
(5, 'customer@example.com', 'password123', 3, 'customer', 'Test', 'Customer'),
(6, 'test@gmail.com', 'Test123', 3, 'customer', 'Test', '');

-- ----------------------------------------------------------------------------
-- TABLE: categories
-- ----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `description` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLE: products
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(150) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `description` text,
  `image` LONGTEXT DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  INDEX `idx_products_category` (`category_id`),
  INDEX `idx_products_stock` (`stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- TABLE: orders
-- ----------------------------------------------------------------------------
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) DEFAULT NULL,
  `date` datetime DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(10,2) NOT NULL,
  `status` enum('Processing','Ready for Pickup','Picked Up','Cancelled') NOT NULL DEFAULT 'Processing',
  `paymentName` varchar(100) NOT NULL,
  `pickup_token` varchar(30) UNIQUE DEFAULT NULL,
  `pickup_date` varchar(20) DEFAULT NULL,
  `pickup_time` varchar(50) DEFAULT NULL,
  `items` JSON NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_orders_user` (`user_id`),
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLE: order_items (1st Normal Form Relational Line Items)
-- ----------------------------------------------------------------------------
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  INDEX `idx_order_items_order` (`order_id`),
  INDEX `idx_order_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- TABLE: comments
-- ----------------------------------------------------------------------------
CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `body` text NOT NULL,
  `rating` tinyint(1) DEFAULT 5,
  `date` datetime DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_comments_product` (`product_id`),
  INDEX `idx_comments_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
