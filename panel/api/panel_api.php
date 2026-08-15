<?php
// Panel API - সব AJAX request হ্যান্ডল করে
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// লগইন - auth চেক ছাড়া
if ($action === 'login') {
    handleLogin(); exit;
}
if ($action === 'logout') {
    handleLogout(); exit;
}
if ($action === 'check_auth') {
    jsonResponse(['authenticated' => isLoggedIn(), 'user' => isLoggedIn() ? getCurrentUser() : null]);
}

// বাকি সব action-এ login দরকার
requireLogin();
$db = getDB();

switch ($action) {

    // ===== DASHBOARD =====
    case 'dashboard_summary':
        $totalInv = $db->query("SELECT COALESCE(SUM(amount),0) as t FROM panel_investments")->fetchColumn();
        $totalSales = $db->query("SELECT COALESCE(SUM(amount),0) as t FROM panel_transactions WHERE type='income' AND category='sale'")->fetchColumn();
        $totalIncome = $db->query("SELECT COALESCE(SUM(amount),0) as t FROM panel_transactions WHERE type='income'")->fetchColumn();
        $totalExpense = $db->query("SELECT COALESCE(SUM(amount),0) as t FROM panel_transactions WHERE type='expense'")->fetchColumn();
        $totalPurchase = $db->query("SELECT COALESCE(SUM(amount),0) as t FROM panel_transactions WHERE category='product_purchase'")->fetchColumn();
        $partnerCount = $db->query("SELECT COUNT(*) FROM panel_users WHERE is_active=1")->fetchColumn();
        $recent = $db->query("SELECT t.*, u.name as by_name FROM panel_transactions t LEFT JOIN panel_users u ON t.created_by=u.id ORDER BY t.created_at DESC LIMIT 5")->fetchAll();
        jsonResponse([
            'success' => true,
            'data' => [
                'totalInvestment' => (float)$totalInv,
                'totalSales' => (float)$totalSales,
                'totalIncome' => (float)$totalIncome,
                'totalExpense' => (float)$totalExpense,
                'totalPurchase' => (float)$totalPurchase,
                'profit' => (float)$totalIncome - (float)$totalExpense,
                'balance' => (float)$totalInv + (float)$totalIncome - (float)$totalExpense,
                'partnerCount' => (int)$partnerCount,
                'recentTransactions' => $recent
            ]
        ]);

    case 'monthly_chart':
        $year = (int)($_GET['year'] ?? date('Y'));
        $sales = $db->prepare("SELECT MONTH(txn_date) as m, SUM(amount) as t FROM panel_transactions WHERE type='income' AND category='sale' AND YEAR(txn_date)=? GROUP BY MONTH(txn_date)");
        $sales->execute([$year]);
        $exp = $db->prepare("SELECT MONTH(txn_date) as m, SUM(amount) as t FROM panel_transactions WHERE type='expense' AND YEAR(txn_date)=? GROUP BY MONTH(txn_date)");
        $exp->execute([$year]);
        jsonResponse(['success'=>true,'sales'=>$sales->fetchAll(),'expenses'=>$exp->fetchAll(),'year'=>$year]);

    // ===== SHAREHOLDERS =====
    case 'get_shareholders':
        $rows = $db->query("SELECT u.*, COALESCE(SUM(i.amount),0) as total_invested FROM panel_users u LEFT JOIN panel_investments i ON u.id=i.user_id GROUP BY u.id ORDER BY total_invested DESC")->fetchAll();
        $totalInv = array_sum(array_column($rows, 'total_invested'));
        $rows = array_map(function($r) use ($totalInv) {
            $r['share_pct'] = $totalInv > 0 ? round(($r['total_invested']/$totalInv)*100, 2) : 0;
            return $r;
        }, $rows);
        jsonResponse(['success'=>true,'data'=>$rows,'totalInvestment'=>(float)$totalInv]);

    case 'add_shareholder':
        requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $phone = trim($data['phone'] ?? '');
        $role = $data['role'] ?? 'partner';
        $pass = $data['password'] ?? '';
        if (!$name || !$email || !$pass) jsonResponse(['error'=>'নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক।'], 400);
        $hashed = password_hash($pass, PASSWORD_BCRYPT);
        try {
            $stmt = $db->prepare("INSERT INTO panel_users (name,email,phone,password,role) VALUES (?,?,?,?,?)");
            $stmt->execute([$name,$email,$phone,$hashed,$role]);
            logActivity('নতুন পার্টনার যোগ', "$name ($email)");
            jsonResponse(['success'=>true,'message'=>"$name পার্টনার হিসেবে যোগ হয়েছেন।",'id'=>$db->lastInsertId()]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') jsonResponse(['error'=>'এই ইমেইল ইতিমধ্যে নিবন্ধিত।'], 400);
            jsonResponse(['error'=>'সমস্যা হয়েছে।'], 500);
        }

    case 'edit_shareholder':
        requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $phone = trim($data['phone'] ?? '');
        $role = $data['role'] ?? 'partner';
        $pass = $data['password'] ?? '';
        
        if (!$id || !$name || !$email) jsonResponse(['error'=>'নাম ও ইমেইল আবশ্যক।'], 400);
        
        try {
            if ($pass) {
                $hashed = password_hash($pass, PASSWORD_BCRYPT);
                $stmt = $db->prepare("UPDATE panel_users SET name=?, email=?, phone=?, role=?, password=? WHERE id=?");
                $stmt->execute([$name, $email, $phone, $role, $hashed, $id]);
            } else {
                $stmt = $db->prepare("UPDATE panel_users SET name=?, email=?, phone=?, role=? WHERE id=?");
                $stmt->execute([$name, $email, $phone, $role, $id]);
            }
            logActivity('পার্টনার তথ্য পরিবর্তন', "ID: $id, Name: $name");
            jsonResponse(['success'=>true,'message'=>'পার্টনারের তথ্য আপডেট হয়েছে।']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') jsonResponse(['error'=>'এই ইমেইল ইতিমধ্যে অন্য কারও অ্যাকাউন্টে আছে।'], 400);
            jsonResponse(['error'=>'সমস্যা হয়েছে।'], 500);
        }

    case 'toggle_partner':
        requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? 0);
        $active = (int)($data['is_active'] ?? 1);
        $stmt = $db->prepare("UPDATE panel_users SET is_active=? WHERE id=?");
        $stmt->execute([$active,$id]);
        logActivity($active ? 'পার্টনার সক্রিয়' : 'পার্টনার নিষ্ক্রিয়', "ID: $id");
        jsonResponse(['success'=>true,'message'=>'আপডেট হয়েছে।']);

    case 'add_partner_investment':
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = (int)($data['user_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0);
        $date = $data['date'] ?? date('Y-m-d');
        $note = $data['note'] ?? '';
        $me = getCurrentUser();
        if (!$userId || $amount <= 0) jsonResponse(['error'=>'ইউজার ও পরিমাণ আবশ্যক।'], 400);
        $stmt = $db->prepare("INSERT INTO panel_investments (user_id,amount,note,inv_date,created_by) VALUES (?,?,?,?,?)");
        $stmt->execute([$userId,$amount,$note,$date,$me['id']]);
        // Also log as transaction
        $stmt2 = $db->prepare("INSERT INTO panel_transactions (type,category,amount,description,txn_date,created_by) VALUES ('income','investment',?,?,?,?)");
        $stmt2->execute([$amount,"বিনিয়োগ প্রাপ্তি: $note",$date,$me['id']]);
        logActivity('বিনিয়োগ যোগ', "৳$amount");
        jsonResponse(['success'=>true,'message'=>'বিনিয়োগ রেকর্ড হয়েছে।']);

    // ===== TRANSACTIONS =====
    case 'get_transactions':
        $type = $_GET['type'] ?? '';
        $cat = $_GET['category'] ?? '';
        $start = $_GET['start'] ?? '';
        $end = $_GET['end'] ?? '';
        $search = $_GET['search'] ?? '';
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = 20; $offset = ($page-1)*$limit;
        $where = '1=1'; $params = [];
        if ($type) { $where .= ' AND t.type=?'; $params[] = $type; }
        if ($cat) { $where .= ' AND t.category=?'; $params[] = $cat; }
        if ($start) { $where .= ' AND t.txn_date>=?'; $params[] = $start; }
        if ($end) { $where .= ' AND t.txn_date<=?'; $params[] = $end; }
        if ($search) { $where .= ' AND t.description LIKE ?'; $params[] = "%$search%"; }
        $countStmt = $db->prepare("SELECT COUNT(*) FROM panel_transactions t WHERE $where");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        $params2 = $params; $params2[] = $limit; $params2[] = $offset;
        $stmt = $db->prepare("SELECT t.*,u.name as by_name FROM panel_transactions t LEFT JOIN panel_users u ON t.created_by=u.id WHERE $where ORDER BY t.txn_date DESC,t.created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute($params2);
        jsonResponse(['success'=>true,'data'=>$stmt->fetchAll(),'total'=>(int)$total,'page'=>$page,'pages'=>ceil($total/$limit)]);

    case 'add_transaction':
        $data = json_decode(file_get_contents('php://input'), true);
        $me = getCurrentUser();
        $stmt = $db->prepare("INSERT INTO panel_transactions (type,category,amount,description,reference_no,txn_date,created_by) VALUES (?,?,?,?,?,?,?)");
        $stmt->execute([$data['type'],$data['category'],(float)$data['amount'],$data['description'],$data['reference_no']??null,$data['date'],$me['id']]);
        logActivity('লেনদেন যোগ', ($data['type']==='income'?'আয়':'ব্যয়').": ৳".$data['amount']);
        jsonResponse(['success'=>true,'message'=>'লেনদেন যোগ হয়েছে।','id'=>$db->lastInsertId()]);

    case 'delete_transaction':
        $data = json_decode(file_get_contents('php://input'), true);
        $db->prepare("DELETE FROM panel_transactions WHERE id=?")->execute([(int)$data['id']]);
        jsonResponse(['success'=>true,'message'=>'মুছে ফেলা হয়েছে।']);

    // ===== INVESTMENTS =====
    case 'get_investments':
        $rows = $db->query("SELECT i.*,u.name as by_name FROM panel_investment_targets i LEFT JOIN panel_users u ON i.created_by=u.id ORDER BY i.inv_date DESC")->fetchAll();
        $total = $db->query("SELECT COALESCE(SUM(amount),0) FROM panel_investment_targets")->fetchColumn();
        jsonResponse(['success'=>true,'data'=>$rows,'total'=>(float)$total]);

    case 'add_investment':
        $data = json_decode(file_get_contents('php://input'), true);
        $me = getCurrentUser();
        $stmt = $db->prepare("INSERT INTO panel_investment_targets (title,amount,category,inv_date,status,note,created_by) VALUES (?,?,?,?,?,?,?)");
        $stmt->execute([$data['title'],(float)$data['amount'],$data['category']??'other',$data['date'],$data['status']??'active',$data['note']??'',$me['id']]);
        $stmt2 = $db->prepare("INSERT INTO panel_transactions (type,category,amount,description,txn_date,created_by) VALUES ('expense','investment',?,?,?,?)");
        $stmt2->execute([(float)$data['amount'],"বিনিয়োগ: ".$data['title'],$data['date'],$me['id']]);
        jsonResponse(['success'=>true,'message'=>'বিনিয়োগ রেকর্ড হয়েছে।']);

    case 'delete_investment':
        $data = json_decode(file_get_contents('php://input'), true);
        $db->prepare("DELETE FROM panel_investment_targets WHERE id=?")->execute([(int)$data['id']]);
        jsonResponse(['success'=>true,'message'=>'মুছে ফেলা হয়েছে।']);

    // ===== PRODUCTS =====
    case 'get_products':
        $rows = $db->query("SELECT p.*,u.name as by_name, (p.quantity-p.sold_quantity) as remaining, (p.sold_quantity*p.selling_price) as revenue, ((p.sold_quantity*p.selling_price)-(p.sold_quantity*p.purchase_price)) as profit FROM panel_products p LEFT JOIN panel_users u ON p.created_by=u.id ORDER BY p.product_date DESC")->fetchAll();
        jsonResponse(['success'=>true,'data'=>$rows]);

    case 'add_product':
        $data = json_decode(file_get_contents('php://input'), true);
        $me = getCurrentUser();
        $qty = (int)$data['quantity'];
        $price = (float)$data['purchase_price'];
        $stmt = $db->prepare("INSERT INTO panel_products (name,category,purchase_price,selling_price,quantity,product_date,note,created_by) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$data['name'],$data['category']??'',$price,(float)($data['selling_price']??0),$qty,$data['date'],$data['note']??'',$me['id']]);
        $stmt2 = $db->prepare("INSERT INTO panel_transactions (type,category,amount,description,txn_date,created_by) VALUES ('expense','product_purchase',?,?,?,?)");
        $stmt2->execute([$qty*$price,"পণ্য ক্রয়: ".$data['name']." ({$qty}পিস × ৳{$price})",$data['date'],$me['id']]);
        jsonResponse(['success'=>true,'message'=>'পণ্য যোগ হয়েছে।']);

    case 'sell_product':
        $data = json_decode(file_get_contents('php://input'), true);
        $me = getCurrentUser();
        $pid = (int)$data['product_id'];
        $soldQty = (int)$data['sold_quantity'];
        $sellPrice = (float)$data['selling_price'];
        $product = $db->prepare("SELECT * FROM panel_products WHERE id=?");
        $product->execute([$pid]);
        $p = $product->fetch();
        if (!$p) jsonResponse(['error'=>'পণ্য পাওয়া যায়নি।'], 404);
        $remaining = $p['quantity'] - $p['sold_quantity'];
        if ($soldQty > $remaining) jsonResponse(['error'=>"স্টকে মাত্র {$remaining} পিস আছে।"], 400);
        $newSold = $p['sold_quantity'] + $soldQty;
        $db->prepare("UPDATE panel_products SET sold_quantity=?,selling_price=? WHERE id=?")->execute([$newSold,$sellPrice,$pid]);
        $revenue = $soldQty * $sellPrice;
        $cost = $soldQty * $p['purchase_price'];
        $profit = $revenue - $cost;
        $date = $data['date'] ?? date('Y-m-d');
        $stmt2 = $db->prepare("INSERT INTO panel_transactions (type,category,amount,description,txn_date,created_by) VALUES ('income','sale',?,?,?,?)");
        $stmt2->execute([$revenue,"বিক্রয়: ".$p['name']." ({$soldQty}পিস × ৳{$sellPrice})",$date,$me['id']]);
        logActivity('বিক্রয়', $p['name'].": ৳$revenue");
        jsonResponse(['success'=>true,'message'=>'বিক্রয় রেকর্ড হয়েছে।','revenue'=>$revenue,'profit'=>$profit]);

    case 'delete_product':
        $data = json_decode(file_get_contents('php://input'), true);
        $db->prepare("DELETE FROM panel_products WHERE id=?")->execute([(int)$data['id']]);
        jsonResponse(['success'=>true,'message'=>'মুছে ফেলা হয়েছে।']);

    // ===== REPORTS =====
    case 'get_reports':
        $start = $_GET['start'] ?? '';
        $end = $_GET['end'] ?? '';
        $dw = ''; $dp = [];
        if ($start && $end) { $dw = "AND txn_date BETWEEN ? AND ?"; $dp = [$start,$end]; }
        $income = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM panel_transactions WHERE type='income' $dw");
        $income->execute($dp); $totalIncome = $income->fetchColumn();
        $expense = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM panel_transactions WHERE type='expense' $dw");
        $expense->execute($dp); $totalExpense = $expense->fetchColumn();
        $sales = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM panel_transactions WHERE category='sale' $dw");
        $sales->execute($dp); $totalSales = $sales->fetchColumn();
        $purchases = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM panel_transactions WHERE category='product_purchase' $dw");
        $purchases->execute($dp); $totalPurchases = $purchases->fetchColumn();
        $totalInv = $db->query("SELECT COALESCE(SUM(amount),0) FROM panel_investments")->fetchColumn();
        $catBreakdown = $db->prepare("SELECT category,type,SUM(amount) as total,COUNT(*) as cnt FROM panel_transactions WHERE 1=1 $dw GROUP BY category,type ORDER BY total DESC");
        $catBreakdown->execute($dp);
        $partnerInv = $db->query("SELECT u.name,COALESCE(SUM(i.amount),0) as invested FROM panel_users u LEFT JOIN panel_investments i ON u.id=i.user_id GROUP BY u.id,u.name ORDER BY invested DESC")->fetchAll();
        jsonResponse(['success'=>true,'data'=>[
            'totalIncome'=>(float)$totalIncome,'totalExpense'=>(float)$totalExpense,
            'totalSales'=>(float)$totalSales,'totalPurchases'=>(float)$totalPurchases,
            'totalInvestments'=>(float)$totalInv,'netProfit'=>(float)$totalIncome-(float)$totalExpense,
            'categoryBreakdown'=>$catBreakdown->fetchAll(),'partnerInvestments'=>$partnerInv
        ]]);

    // ===== ACTIVITY LOG =====
    case 'get_activity':
        $rows = $db->query("SELECT a.*,u.name FROM panel_activity_logs a LEFT JOIN panel_users u ON a.user_id=u.id ORDER BY a.created_at DESC LIMIT 50")->fetchAll();
        jsonResponse(['success'=>true,'data'=>$rows]);

    default:
        jsonResponse(['error'=>'অজানা অনুরোধ।'], 400);
}

// ===== AUTH HANDLERS =====

function handleLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = strtolower(trim($data['email'] ?? ''));
    $pass = $data['password'] ?? '';
    if (!$email || !$pass) { jsonResponse(['error'=>'ইমেইল ও পাসওয়ার্ড দিন।'], 400); }
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM panel_users WHERE email=? AND is_active=1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($pass, $user['password'])) {
        jsonResponse(['error'=>'ইমেইল বা পাসওয়ার্ড ভুল।'], 401);
    }
    startPanelSession();
    $_SESSION['panel_user_id'] = $user['id'];
    $_SESSION['panel_user_name'] = $user['name'];
    $_SESSION['panel_user_email'] = $user['email'];
    $_SESSION['panel_user_role'] = $user['role'];
    // Activity log
    try {
        $db->prepare("INSERT INTO panel_activity_logs (user_id,action,ip_address,created_at) VALUES (?,?,?,NOW())")->execute([$user['id'],'লগইন করেছেন',$_SERVER['REMOTE_ADDR']??'']);
    } catch(Exception $e) {}
    jsonResponse(['success'=>true,'user'=>['id'=>$user['id'],'name'=>$user['name'],'email'=>$user['email'],'role'=>$user['role']]]);
}

function handleLogout() {
    startPanelSession();
    session_unset(); session_destroy();
    jsonResponse(['success'=>true,'message'=>'লগআউট সফল।']);
}
?>
