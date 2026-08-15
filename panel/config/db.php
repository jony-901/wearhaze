<?php
// Hostinger Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'u304991648_wearhaze_db');
define('DB_USER', 'u304991648_wearhaze_user');
define('DB_PASS', 'WearHazeDetaBasePass1');

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}
