<?php
require_once __DIR__ . '/config/db.php';
$sql = file_get_contents(__DIR__ . '/panel_database.sql');
try {
    $db = getDB();
    $db->exec($sql);
    echo "<h1 style='color:green;'>SUCCESS!</h1>";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
