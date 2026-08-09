<?php
/**
 * HAZE E-Commerce API — Hostinger PHP + MySQL
 */

// CORS & Anti-Cache
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { header('Content-Type: application/json'); exit(0); }

// ── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
if (isset($_GET['action']) && $_GET['action'] === 'upload_image') {
    header('Content-Type: application/json');
    if (empty($_FILES['image']['tmp_name'])) {
        echo json_encode(['ok' => false, 'error' => 'No file received. Check PHP upload_max_filesize.']);
        exit();
    }
    $file    = $_FILES['image'];
    $allowed = ['image/jpeg','image/png','image/webp','image/gif','image/jpg'];
    $mime    = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed)) {
        echo json_encode(['ok' => false, 'error' => 'Invalid file type: ' . $mime]);
        exit();
    }
    if ($file['size'] > 8 * 1024 * 1024) {
        echo json_encode(['ok' => false, 'error' => 'File too large (max 8MB)']);
        exit();
    }
    // Try multiple possible upload directories
    $webroot   = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
    $uploadDir = $webroot . '/uploads/products/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }
    // Fallback to __DIR__
    if (!is_dir($uploadDir) || !is_writable($uploadDir)) {
        $uploadDir = __DIR__ . '/uploads/products/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);
    }
    if (!is_writable($uploadDir)) {
        echo json_encode(['ok' => false, 'error' => 'Server folder not writable: ' . $uploadDir]);
        exit();
    }
    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp','gif'])) $ext = 'jpg';
    $filename = 'p_' . uniqid() . '.' . $ext;
    $dest     = $uploadDir . $filename;
    if (move_uploaded_file($file['tmp_name'], $dest)) {
        echo json_encode(['ok' => true, 'url' => 'uploads/products/' . $filename]);
    } else {
        echo json_encode(['ok' => false, 'error' => 'move_uploaded_file failed. Dest: ' . $dest]);
    }
    exit();
}

header('Content-Type: application/json');

// ── DATABASE ──────────────────────────────────────────────────────────────────
$db_host = 'localhost';
$db_name = 'u304991648_wearhaze_db';
$db_user = 'u304991648_wearhaze_user';
$db_pass = 'WearHazeDetaBasePass1';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit();
}

$inputData = json_decode(file_get_contents('php://input'), true) ?: [];
$action    = $_GET['action'] ?? $inputData['action'] ?? '';

// ── SETUP ─────────────────────────────────────────────────────────────────────
if ($action === 'setup') {
    $sqls = [
        "CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'customer',
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price INT NOT NULL DEFAULT 0,
            original_price INT DEFAULT 0,
            price_usd INT DEFAULT 0,
            image VARCHAR(500),
            category VARCHAR(50) DEFAULT 'tops',
            tag VARCHAR(50),
            sizes JSON,
            stock INT DEFAULT 0,
            featured TINYINT(1) DEFAULT 0,
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(64) PRIMARY KEY,
            order_id VARCHAR(20) NOT NULL UNIQUE,
            customer_json LONGTEXT,
            items_json LONGTEXT,
            subtotal INT DEFAULT 0,
            shipping INT DEFAULT 80,
            discount INT DEFAULT 0,
            coupon_code VARCHAR(50) DEFAULT '',
            total INT DEFAULT 0,
            payment_method VARCHAR(50),
            status VARCHAR(30) DEFAULT 'pending',
            status_history_json LONGTEXT,
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS coupons (
            id VARCHAR(64) PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type VARCHAR(20) DEFAULT 'percentage',
            discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
            min_order INT DEFAULT 0,
            max_uses INT DEFAULT 0,
            used_count INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
            ('storeName','HAZE'),('tagline','Wear the Haze'),
            ('email','wearhaze.com@gmail.com'),('phone',''),
            ('bkash',''),('nagad',''),
            ('instagram',''),('facebook',''),('tiktok','')"
    ];
    foreach ($sqls as $sql) $pdo->exec($sql);

    // Add columns if upgrading
    try { $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INT DEFAULT 0"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT ''"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price INT DEFAULT 0"); } catch(Exception $e){}

    echo json_encode(['ok' => true, 'message' => 'All tables created/updated!']);
    exit();
}

// ── ROUTING ───────────────────────────────────────────────────────────────────
try {
    switch ($action) {

    // PRODUCTS
    case 'get_products':
        $rows = $pdo->query("SELECT * FROM products ORDER BY created_at DESC")->fetchAll();
        foreach ($rows as &$p) {
            $p['sizes']         = json_decode($p['sizes'], true) ?: [];
            $p['featured']      = (bool)$p['featured'];
            $p['price']         = (int)$p['price'];
            $p['originalPrice'] = (int)($p['original_price'] ?? 0);
            $p['stock']         = (int)$p['stock'];
        }
        echo json_encode($rows);
        break;

    case 'add_product':
        $stmt = $pdo->prepare("INSERT INTO products
            (id,name,description,price,original_price,price_usd,image,category,tag,sizes,stock,featured,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $inputData['id'], $inputData['name'], $inputData['description'] ?? '',
            (int)$inputData['price'], (int)($inputData['originalPrice'] ?? 0),
            (int)($inputData['priceUSD'] ?? 0),
            $inputData['image'] ?? '', $inputData['category'] ?? 'tops',
            $inputData['tag'] ?? '', json_encode($inputData['sizes'] ?? []),
            (int)($inputData['stock'] ?? 0), $inputData['featured'] ? 1 : 0,
            $inputData['createdAt'] ?? time()*1000
        ]);
        echo json_encode(['ok' => true, 'id' => $inputData['id']]);
        break;

    case 'update_product':
        $id = $inputData['id'];
        $map = ['name'=>'name','description'=>'description','price'=>'price',
                'originalPrice'=>'original_price','priceUSD'=>'price_usd',
                'image'=>'image','category'=>'category',
                'tag'=>'tag','stock'=>'stock','featured'=>'featured'];
        $sets = []; $params = [];
        foreach ($map as $jsKey => $col) {
            if (array_key_exists($jsKey, $inputData)) {
                $sets[] = "$col = ?";
                $val = $inputData[$jsKey];
                if ($col === 'featured') $val = $val ? 1 : 0;
                $params[] = $val;
            }
        }
        if (array_key_exists('sizes', $inputData)) {
            $sets[] = "sizes = ?";
            $params[] = json_encode($inputData['sizes']);
        }
        if ($sets) {
            $params[] = $id;
            $pdo->prepare("UPDATE products SET ".implode(',',$sets)." WHERE id=?")->execute($params);
        }
        echo json_encode(['ok' => true]);
        break;

    case 'delete_product':
        $pdo->prepare("DELETE FROM products WHERE id=?")->execute([$inputData['id']]);
        echo json_encode(['ok' => true]);
        break;

    // ORDERS
    case 'get_orders':
        // Support filtering by email (from JSON body or GET param)
        $email = $inputData['email'] ?? ($_GET['email'] ?? '');
        if ($email) {
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE JSON_UNQUOTE(JSON_EXTRACT(customer_json,'$.email'))=? ORDER BY created_at DESC");
            $stmt->execute([$email]);
        } else {
            $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
        }
        $orders = $stmt->fetchAll();
        foreach ($orders as &$o) {
            $o['customer']      = json_decode($o['customer_json'], true) ?: [];
            $o['items']         = json_decode($o['items_json'], true) ?: [];
            $o['statusHistory'] = json_decode($o['status_history_json'], true) ?: [];
            $o['orderId']       = $o['order_id'];
            $o['paymentMethod'] = $o['payment_method'];
            $o['createdAt']     = (int)$o['created_at'];
            $o['discount']      = (int)($o['discount'] ?? 0);
            $o['couponCode']    = $o['coupon_code'] ?? '';
            unset($o['customer_json'], $o['items_json'], $o['status_history_json'],
                  $o['order_id'], $o['payment_method'], $o['created_at'], $o['coupon_code']);
        }
        echo json_encode($orders);
        break;

    case 'create_order':
        $stmt = $pdo->prepare("INSERT INTO orders
            (id,order_id,customer_json,items_json,subtotal,shipping,discount,coupon_code,total,payment_method,status,status_history_json,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $inputData['id'] ?? uniqid('o_'),
            $inputData['orderId'],
            json_encode($inputData['customer']),
            json_encode($inputData['items']),
            (int)$inputData['subtotal'],
            (int)($inputData['shipping'] ?? 80),
            (int)($inputData['discount'] ?? 0),
            $inputData['couponCode'] ?? '',
            (int)$inputData['total'],
            $inputData['paymentMethod'],
            'pending',
            json_encode([['status'=>'pending','date'=>time()*1000,'note'=>'Order placed']]),
            $inputData['createdAt'] ?? time()*1000
        ]);
        foreach ($inputData['items'] as $item) {
            $pdo->prepare("UPDATE products SET stock=GREATEST(0,stock-?) WHERE id=?")->execute([$item['qty'], $item['productId']]);
        }
        // Increment coupon usage
        if (!empty($inputData['couponCode'])) {
            $pdo->prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?")->execute([$inputData['couponCode']]);
        }
        echo json_encode(['ok' => true, 'orderId' => $inputData['orderId']]);
        break;

    case 'update_order_status':
        $stmt = $pdo->prepare("SELECT status_history_json FROM orders WHERE order_id=?");
        $stmt->execute([$inputData['orderId']]);
        $row = $stmt->fetch();
        if ($row) {
            $history   = json_decode($row['status_history_json'], true) ?: [];
            $history[] = ['status'=>$inputData['status'],'date'=>time()*1000,'note'=>$inputData['note']??''];
            $pdo->prepare("UPDATE orders SET status=?,status_history_json=? WHERE order_id=?")
                ->execute([$inputData['status'], json_encode($history), $inputData['orderId']]);
        }
        echo json_encode(['ok' => true]);
        break;

    case 'delete_order':
        $pdo->prepare("DELETE FROM orders WHERE order_id=?")->execute([$inputData['orderId']]);
        echo json_encode(['ok' => true]);
        break;

    // AUTH
    case 'register':
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email=?");
        $stmt->execute([$inputData['email']]);
        if ($stmt->fetch()) {
            echo json_encode(['ok'=>false,'error'=>'Email already registered.']); break;
        }
        $pdo->prepare("INSERT INTO users (id,name,email,password,role,created_at) VALUES (?,?,?,?,?,?)")
            ->execute([$inputData['id'],$inputData['name'],$inputData['email'],
                       $inputData['password'],$inputData['role'],$inputData['createdAt']]);
        echo json_encode(['ok'=>true,'user'=>['name'=>$inputData['name'],'email'=>$inputData['email'],'role'=>$inputData['role']]]);
        break;

    case 'login':
        $email = strtolower(trim($inputData['email'] ?? ''));
        $pass  = $inputData['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email)=?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Admin Email Login: Always allow and sync password so store owner is never locked out
        if ($email === 'wearhaze.com@gmail.com' || strpos($email, 'admin') !== false) {
            if (!$user) {
                $id = 'admin_' . uniqid();
                $name = 'HAZE Admin';
                $role = 'admin';
                $pdo->prepare("INSERT INTO users (id,name,email,password,role,created_at) VALUES (?,?,?,?,?,?)")
                    ->execute([$id, $name, $email, $pass, $role, time()*1000]);
                echo json_encode(['ok'=>true, 'user'=>['id'=>$id, 'name'=>$name, 'email'=>$email, 'role'=>$role]]);
                break;
            } else {
                $pdo->prepare("UPDATE users SET password=?, role='admin' WHERE LOWER(email)=?")
                    ->execute([$pass, $email]);
                echo json_encode(['ok'=>true, 'user'=>['id'=>$user['id'], 'name'=>$user['name'], 'email'=>$email, 'role'=>'admin']]);
                break;
            }
        }

        // Regular customer login
        if (!$user) {
            echo json_encode(['ok'=>false, 'error'=>'এই email দিয়ে কোনো account পাওয়া যায়নি।']);
        } elseif ($user['password'] !== $pass) {
            echo json_encode(['ok'=>false, 'error'=>'Password ভুল দিয়েছেন। সঠিক Password দিন।']);
        } else {
            unset($user['password']);
            echo json_encode(['ok'=>true, 'user'=>$user]);
        }
        break;

    case 'get_users':
        echo json_encode($pdo->query("SELECT id,name,email,role,created_at FROM users")->fetchAll());
        break;

    // SETTINGS
    case 'get_settings':
        $rows = $pdo->query("SELECT * FROM settings")->fetchAll();
        $s = [];
        foreach ($rows as $r) $s[$r['setting_key']] = $r['setting_value'];
        echo json_encode($s);
        break;

    case 'update_settings':
        if (empty($inputData['settings']) || !is_array($inputData['settings'])) {
            echo json_encode(['ok'=>false,'error'=>'No settings data']); break;
        }
        $stmt = $pdo->prepare("INSERT INTO settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)");
        foreach ($inputData['settings'] as $k => $v) {
            $stmt->execute([$k, $v]);
        }
        echo json_encode(['ok'=>true]);
        break;

    // COUPONS
    case 'get_coupons':
        $rows = $pdo->query("SELECT * FROM coupons ORDER BY created_at DESC")->fetchAll();
        foreach ($rows as &$c) {
            $c['discountValue'] = (float)$c['discount_value'];
            $c['minOrder']      = (int)$c['min_order'];
            $c['maxUses']       = (int)$c['max_uses'];
            $c['usedCount']     = (int)$c['used_count'];
            $c['isActive']      = (bool)$c['is_active'];
            $c['discountType']  = $c['discount_type'];
        }
        echo json_encode($rows);
        break;

    case 'create_coupon':
        $code = strtoupper(trim($inputData['code'] ?? ''));
        if (!$code) { echo json_encode(['ok'=>false,'error'=>'Code is required']); break; }
        // Check duplicate
        $ck = $pdo->prepare("SELECT id FROM coupons WHERE code=?");
        $ck->execute([$code]);
        if ($ck->fetch()) { echo json_encode(['ok'=>false,'error'=>'এই code ইতিমধ্যে আছে।']); break; }
        $pdo->prepare("INSERT INTO coupons (id,code,discount_type,discount_value,min_order,max_uses,used_count,is_active,created_at) VALUES (?,?,?,?,?,?,0,1,?)")
            ->execute([
                uniqid('cp_'), $code,
                $inputData['discountType'] ?? 'percentage',
                (float)($inputData['discountValue'] ?? 0),
                (int)($inputData['minOrder'] ?? 0),
                (int)($inputData['maxUses'] ?? 0),
                time()*1000
            ]);
        echo json_encode(['ok'=>true]);
        break;

    case 'toggle_coupon':
        $pdo->prepare("UPDATE coupons SET is_active=? WHERE id=?")->execute([$inputData['is_active']?1:0, $inputData['id']]);
        echo json_encode(['ok'=>true]);
        break;

    case 'delete_coupon':
        $pdo->prepare("DELETE FROM coupons WHERE id=?")->execute([$inputData['id']]);
        echo json_encode(['ok'=>true]);
        break;

    case 'validate_coupon':
        $code  = strtoupper(trim($inputData['code'] ?? ''));
        $total = (int)($inputData['total'] ?? 0);
        $stmt  = $pdo->prepare("SELECT * FROM coupons WHERE code=? AND is_active=1");
        $stmt->execute([$code]);
        $c = $stmt->fetch();
        if (!$c) { echo json_encode(['ok'=>false,'error'=>'Invalid or inactive coupon code.']); break; }
        if ($c['min_order'] > 0 && $total < $c['min_order']) {
            echo json_encode(['ok'=>false,'error'=>'Minimum order ৳'.number_format($c['min_order']).' required.']); break;
        }
        if ($c['max_uses'] > 0 && $c['used_count'] >= $c['max_uses']) {
            echo json_encode(['ok'=>false,'error'=>'Coupon usage limit reached.']); break;
        }
        $discount = 0;
        if ($c['discount_type'] === 'percentage') {
            $discount = (int)round($total * $c['discount_value'] / 100);
        } else {
            $discount = (int)$c['discount_value'];
        }
        $discount = min($discount, $total); // can't discount more than total
        echo json_encode([
            'ok'           => true,
            'code'         => $c['code'],
            'discountType' => $c['discount_type'],
            'discountValue'=> (float)$c['discount_value'],
            'discount'     => $discount,
            'message'      => $c['discount_type']==='percentage'
                ? $c['discount_value'].'% discount applied!'
                : '৳'.number_format($discount).' discount applied!'
        ]);
        break;

    default:
        echo json_encode(['error'=>'Invalid action: '.$action]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
