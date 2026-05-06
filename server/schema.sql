-- Wedding Seating System — MySQL Schema
-- Run this file to set up your database before starting the server.

CREATE DATABASE IF NOT EXISTS wedding_seating CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wedding_seating;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  max_seats INT NOT NULL DEFAULT 10,
  pos_x FLOAT DEFAULT NULL,
  pos_y FLOAT DEFAULT NULL,
  pos_width FLOAT DEFAULT NULL,
  pos_height FLOAT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  table_id INT DEFAULT NULL,
  seat_number INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  primary_color VARCHAR(20) NOT NULL DEFAULT '#d4a574',
  secondary_color VARCHAR(20) NOT NULL DEFAULT '#8b5e3c',
  font_family VARCHAR(200) NOT NULL DEFAULT '''Playfair Display'', serif',
  background_image TEXT DEFAULT NULL,
  event_name VARCHAR(200) NOT NULL DEFAULT 'Our Wedding',
  event_date VARCHAR(20) DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default admin (password: admin123)
-- SHA2(CONCAT('admin123', 'wedding_salt_2024'), 256)
INSERT IGNORE INTO users (username, password_hash)
VALUES ('admin', SHA2(CONCAT('admin123', 'wedding_salt_2024'), 256));

-- Default settings row
INSERT IGNORE INTO settings (id) VALUES (1);
