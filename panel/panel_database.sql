-- =============================================
-- Wearhaze Business Panel - New Tables
-- বিদ্যমান database.sql-এর সাথে চালান
-- =============================================


-- প্যানেল পার্টনার/অ্যাডমিন টেবিল
CREATE TABLE IF NOT EXISTS panel_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('admin', 'partner') DEFAULT 'partner',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- পার্টনার বিনিয়োগ টেবিল
CREATE TABLE IF NOT EXISTS panel_investments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  note TEXT,
  inv_date DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES panel_users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES panel_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- লেনদেন টেবিল
CREATE TABLE IF NOT EXISTS panel_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('income','expense') NOT NULL,
  category ENUM('investment','product_purchase','sale','salary','marketing','rent','profit','other') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  reference_no VARCHAR(100),
  txn_date DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES panel_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- পণ্য ইনভেন্টরি টেবিল
CREATE TABLE IF NOT EXISTS panel_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  purchase_price DECIMAL(15,2) NOT NULL,
  selling_price DECIMAL(15,2),
  quantity INT DEFAULT 0,
  sold_quantity INT DEFAULT 0,
  product_date DATE NOT NULL,
  note TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES panel_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- বিনিয়োগ ট্র্যাকিং টেবিল
CREATE TABLE IF NOT EXISTS panel_investment_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category VARCHAR(100) DEFAULT 'other',
  inv_date DATE NOT NULL,
  status ENUM('active','returned','partial') DEFAULT 'active',
  note TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES panel_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- অ্যাক্টিভিটি লগ
CREATE TABLE IF NOT EXISTS panel_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES panel_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ইনডেক্স
CREATE INDEX IF NOT EXISTS idx_txn_date ON panel_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_txn_type ON panel_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inv_user ON panel_investments(user_id);

-- ডিফল্ট অ্যাডমিন (পাসওয়ার্ড: WearAdmin2024!)
-- bcrypt hash of "WearAdmin2024!"
INSERT IGNORE INTO panel_users (name, email, password, role) VALUES
('Admin', 'admin@wearhaze.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
