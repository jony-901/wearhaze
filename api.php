<?php
/**
 * HAZE E-Commerce API (Hostinger / PHP + MySQL)
 * Handles all database operations for the frontend.
 */

// Allow CORS for local testing, remove or adjust in production
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ==========================================
// DATABASE CONFIGURATION — Hostinger
// ==========================================
$db_host = 'localhost';
$db_name = 'u304991648_wearhaze_db';   // Hostinger DB Name
$db_user = 'u304991648_wearhaze_user'; // Hostinger DB User
$db_pass = 'WearHazeDetaBasePass1';    // Hostinger DB Password

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Please configure api.php']);
    exit();
}

// Helper to get POST/PUT JSON payload
$inputData = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $_GET['action'] ?? $inputData['action'] ?? '';

// ==========================================
// ONE-TIME SETUP — Creates all DB tables
// Access: https://yourdomain.com/api.php?action=setup
// ==========================================
if ($action === 'setup') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'customer',
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price INT NOT NULL DEFAULT 0,
            price_usd INT DEFAULT 0,
            image VARCHAR(500),
            category VARCHAR(50) DEFAULT 'tops',
            tag VARCHAR(50),
            sizes JSON,
            stock INT DEFAULT 0,
            featured TINYINT(1) DEFAULT 0,
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(64) PRIMARY KEY,
            order_id VARCHAR(20) NOT NULL UNIQUE,
            customer_json LONGTEXT,
            items_json LONGTEXT,
            subtotal INT DEFAULT 0,
            shipping INT DEFAULT 80,
            total INT DEFAULT 0,
            payment_method VARCHAR(50),
            status VARCHAR(30) DEFAULT 'pending',
            status_history_json LONGTEXT,
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
            ('storeName', 'HAZE'),
            ('tagline', 'Wear the Haze'),
            ('email', 'wearhaze.com@gmail.com'),
            ('phone', ''),
            ('bkash', ''),
            ('nagad', ''),
            ('instagram', ''),
            ('facebook', ''),
            ('tiktok', '');
    ");
    echo json_encode(['ok' => true, 'message' => 'All database tables created successfully! You can now delete this setup endpoint or ignore it.']);
    exit();
}

// Routing
try {
    switch ($action) {
        
        // --- PRODUCTS ---
        case 'get_products':
            $stmt = $pdo->query("SELECT * FROM products ORDER BY created_at DESC");
            $products = $stmt->fetchAll();
            // Decode sizes JSON
            foreach ($products as &$p) { $p['sizes'] = json_decode($p['sizes'], true); $p['featured'] = (bool)$p['featured']; }
            echo json_encode($products);
            break;

        case 'add_product':
            $stmt = $pdo->prepare("INSERT INTO products (id, name, description, price, price_usd, image, category, tag, sizes, stock, featured, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $inputData['id'], $inputData['name'], $inputData['description'], $inputData['price'], $inputData['priceUSD'],
                $inputData['image'], $inputData['category'], $inputData['tag'], json_encode($inputData['sizes']),
                $inputData['stock'], $inputData['featured'] ? 1 : 0, $inputData['createdAt']
            ]);
            echo json_encode(['ok' => true]);
            break;

        case 'update_product':
            $id = $inputData['id'];
            $updates = [];
            $params = [];
            foreach (['name', 'description', 'price', 'price_usd', 'image', 'category', 'tag', 'stock', 'featured'] as $field) {
                $jsField = $field === 'price_usd' ? 'priceUSD' : $field;
                if (isset($inputData[$jsField])) {
                    $updates[] = "$field = ?";
                    $val = $inputData[$jsField];
                    if ($field === 'featured') $val = $val ? 1 : 0;
                    $params[] = $val;
                }
            }
            if (isset($inputData['sizes'])) {
                $updates[] = "sizes = ?";
                $params[] = json_encode($inputData['sizes']);
            }
            if (count($updates) > 0) {
                $params[] = $id;
                $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }
            echo json_encode(['ok' => true]);
            break;

        case 'delete_product':
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$inputData['id']]);
            echo json_encode(['ok' => true]);
            break;

        // --- ORDERS ---
        case 'get_orders':
            $sql = "SELECT * FROM orders ORDER BY created_at DESC";
            $params = [];
            if (!empty($_GET['email'])) {
                $sql = "SELECT * FROM orders WHERE JSON_EXTRACT(customer_json, '$.email') = ? ORDER BY created_at DESC";
                $params[] = $_GET['email'];
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $orders = $stmt->fetchAll();
            foreach ($orders as &$o) {
                $o['customer'] = json_decode($o['customer_json'], true);
                $o['items'] = json_decode($o['items_json'], true);
                $o['statusHistory'] = json_decode($o['status_history_json'], true);
                unset($o['customer_json'], $o['items_json'], $o['status_history_json']);
                // camelCase map
                $o['orderId'] = $o['order_id'];
                $o['paymentMethod'] = $o['payment_method'];
                $o['createdAt'] = (int)$o['created_at'];
            }
            echo json_encode($orders);
            break;

        case 'create_order':
            $stmt = $pdo->prepare("INSERT INTO orders (id, order_id, customer_json, items_json, subtotal, shipping, total, payment_method, status, status_history_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $inputData['id'] ?? uniqid('o_'), $inputData['orderId'], json_encode($inputData['customer']), 
                json_encode($inputData['items']), $inputData['subtotal'], $inputData['shipping'], 
                $inputData['total'], $inputData['paymentMethod'], $inputData['status'], 
                json_encode($inputData['statusHistory']), $inputData['createdAt']
            ]);
            
            // Deduct stock
            foreach ($inputData['items'] as $item) {
                $pdo->prepare("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?")->execute([$item['qty'], $item['productId']]);
            }
            echo json_encode(['ok' => true]);
            break;

        case 'update_order_status':
            $stmt = $pdo->prepare("SELECT status_history_json FROM orders WHERE order_id = ?");
            $stmt->execute([$inputData['orderId']]);
            $row = $stmt->fetch();
            if ($row) {
                $history = json_decode($row['status_history_json'], true) ?: [];
                $history[] = ['status' => $inputData['status'], 'date' => time() * 1000, 'note' => $inputData['note'] ?? ''];
                
                $upd = $pdo->prepare("UPDATE orders SET status = ?, status_history_json = ? WHERE order_id = ?");
                $upd->execute([$inputData['status'], json_encode($history), $inputData['orderId']]);
            }
            echo json_encode(['ok' => true]);
            break;

        case 'delete_order':
            $stmt = $pdo->prepare("DELETE FROM orders WHERE order_id = ?");
            $stmt->execute([$inputData['orderId']]);
            echo json_encode(['ok' => true]);
            break;

        // --- AUTH ---
        case 'register':
            // Simple hash (same logic as before, just using MD5 here for simplicity over the custom one, or we can use md5 in JS)
            // But actually we should store the hash passed by JS since JS does it.
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$inputData['email']]);
            if ($stmt->fetch()) {
                echo json_encode(['ok' => false, 'error' => 'Email already registered.']);
                break;
            }
            $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $inputData['id'], $inputData['name'], $inputData['email'], $inputData['password'], 
                $inputData['role'], $inputData['createdAt']
            ]);
            echo json_encode(['ok' => true]);
            break;

        case 'login':
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$inputData['email']]);
            $user = $stmt->fetch();
            if (!$user) {
                echo json_encode(['ok' => false, 'error' => 'No account found with this email.']);
            } else if ($user['password'] !== $inputData['password']) {
                echo json_encode(['ok' => false, 'error' => 'Incorrect password.']);
            } else {
                unset($user['password']);
                echo json_encode(['ok' => true, 'user' => $user]);
            }
            break;

        case 'get_users':
            $stmt = $pdo->query("SELECT id, name, email, role, created_at FROM users");
            echo json_encode($stmt->fetchAll());
            break;

        // --- SETTINGS ---
        case 'get_settings':
            $stmt = $pdo->query("SELECT * FROM settings");
            $rows = $stmt->fetchAll();
            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            echo json_encode($settings);
            break;

        case 'update_settings':
            foreach ($inputData['settings'] as $k => $v) {
                $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                $stmt->execute([$k, $v, $v]);
            }
            echo json_encode(['ok' => true]);
            break;

        default:
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
