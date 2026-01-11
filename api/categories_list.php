<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';

// publikus: nem kell login a kategóriákhoz
$stmt = db()->query("SELECT id, name FROM categories ORDER BY name ASC");
json_response(['items' => $stmt->fetchAll()]);
