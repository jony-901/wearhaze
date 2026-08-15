<?php
require_once __DIR__ . '/includes/auth.php';
startPanelSession();
try {
    $db = getDB();
    $userId = $_SESSION['panel_user_id'] ?? null;
    if ($userId) {
        $db->prepare("INSERT INTO panel_activity_logs (user_id,action,ip_address,created_at) VALUES (?,?,?,NOW())")->execute([$userId,'লগআউট করেছেন',$_SERVER['REMOTE_ADDR']??'']);
    }
} catch(Exception $e) {}
session_unset();
session_destroy();
header('Location: /panel/');
exit;
?>
