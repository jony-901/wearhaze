<?php
// =============================================
// Authentication Helper Functions
// =============================================
require_once __DIR__ . '/../config/db.php';

function startPanelSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => 8 * 3600, // 8 ঘন্টা
            'path' => '/panel',
            'secure' => isset($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        session_start();
    }
}

function isLoggedIn() {
    startPanelSession();
    return isset($_SESSION['panel_user_id']) && !empty($_SESSION['panel_user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        if (isAjaxRequest()) {
            http_response_code(401);
            echo json_encode(['error' => 'লগইন প্রয়োজন।', 'redirect' => '/panel/']);
            exit;
        }
        header('Location: /panel/');
        exit;
    }
}

function getCurrentUser() {
    startPanelSession();
    return [
        'id' => $_SESSION['panel_user_id'] ?? null,
        'name' => $_SESSION['panel_user_name'] ?? '',
        'email' => $_SESSION['panel_user_email'] ?? '',
        'role' => $_SESSION['panel_user_role'] ?? '',
    ];
}

function isAdmin() {
    $user = getCurrentUser();
    return $user['role'] === 'admin';
}

function requireAdmin() {
    requireLogin();
    if (!isAdmin()) {
        if (isAjaxRequest()) {
            http_response_code(403);
            echo json_encode(['error' => 'শুধুমাত্র অ্যাডমিনরা এই কাজ করতে পারবেন।']);
            exit;
        }
        header('Location: /panel/dashboard.php');
        exit;
    }
}

function isAjaxRequest() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function logActivity($action, $details = '') {
    $user = getCurrentUser();
    if (!$user['id']) return;
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO panel_activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmt->execute([$user['id'], $action, $details, $_SERVER['REMOTE_ADDR'] ?? '']);
    } catch (Exception $e) {}
}

function formatMoney($amount) {
    return '৳' . number_format((float)$amount, 0, '.', ',');
}
?>
