<?php
$pdo = new PDO("mysql:host=localhost;dbname=wearhaze", "root", "");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("ALTER TABLE settings MODIFY setting_value LONGTEXT");
echo "Done";
?>
