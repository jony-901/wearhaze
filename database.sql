-- HAZE E-Commerce MySQL Database Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer',
    created_at BIGINT NOT NULL
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    price_usd INT NOT NULL,
    image VARCHAR(255),
    category VARCHAR(50),
    tag VARCHAR(50),
    sizes TEXT, -- Stored as JSON array like '["S", "M", "L"]'
    stock INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY, -- Internal UUID
    order_id VARCHAR(20) NOT NULL UNIQUE, -- HZ-XXXXXX format
    customer_json TEXT NOT NULL, -- Stored as JSON {name, email, phone, address...}
    items_json TEXT NOT NULL, -- Stored as JSON array of items
    subtotal INT NOT NULL,
    shipping INT NOT NULL,
    total INT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    status_history_json TEXT, -- Stored as JSON array
    created_at BIGINT NOT NULL
);

-- 4. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT
);

-- Insert Default Settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('storeName', 'HAZE'),
('tagline', 'Wear the Haze'),
('email', 'hello@wearhaze.com'),
('phone', '+880 1XXX-XXXXXX'),
('bkash', '01XXXXXXXXX'),
('nagad', '01XXXXXXXXX'),
('instagram', 'https://instagram.com/wearhaze'),
('facebook', 'https://facebook.com/wearhaze'),
('tiktok', 'https://tiktok.com/@wearhaze'),
('admin_email', 'wearhaze.com@gmail.com');

-- Insert Default Products (Optional, for initial testing)
INSERT IGNORE INTO products (id, name, description, price, price_usd, image, category, tag, sizes, stock, featured, created_at) VALUES
('haze-tee-001', 'Oversized Tee', '100% Cotton · Dropped Shoulder · Screen Printed', 850, 8, 'images/product-tee.png', 'tops', 'New', '["S","M","L","XL","XXL"]', 50, TRUE, UNIX_TIMESTAMP(NOW()) * 1000),
('haze-hoodie-001', 'Hoodie', 'Heavy Fleece · Kangaroo Pocket · Embroidered Logo', 1800, 16, 'images/product-hoodie.png', 'tops', 'Popular', '["S","M","L","XL"]', 30, TRUE, UNIX_TIMESTAMP(NOW()) * 1000),
('haze-cargo-001', 'Cargo Pants', 'Wide Leg · 6 Pockets · Utility Style', 2200, 20, 'images/product-cargo.png', 'bottoms', 'Limited', '["S","M","L","XL"]', 20, TRUE, UNIX_TIMESTAMP(NOW()) * 1000),
('haze-cap-001', '5-Panel Cap', 'Embroidered Logo · Adjustable Strap', 650, 6, 'images/product-cap.png', 'accessories', '', '["One Size"]', 100, TRUE, UNIX_TIMESTAMP(NOW()) * 1000),
('haze-tote-001', 'Tote Bag', 'Canvas · Screen Printed · Large', 400, 4, 'images/product-tote.png', 'accessories', '', '["One Size"]', 80, TRUE, UNIX_TIMESTAMP(NOW()) * 1000);
