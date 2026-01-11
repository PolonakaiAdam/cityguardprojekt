<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$user = require_login();

$status = $_GET['status'] ?? null;
$category = $_GET['category_id'] ?? null;

$sql = "SELECT r.id, r.title, r.status, r.address, r.created_at,
               c.name AS category,
               u.name AS created_by
        FROM reports r
        JOIN categories c ON c.id=r.category_id
        JOIN users u ON u.id=r.user_id
        WHERE 1=1";
$params = [];

if ($user['role'] === 'citizen') {
  $sql .= " AND r.user_id = ?";
  $params[] = $user['id'];
}

if ($status) { $sql .= " AND r.status = ?"; $params[] = $status; }
if ($category) { $sql .= " AND r.category_id = ?"; $params[] = (int)$category; }

$sql .= " ORDER BY r.created_at DESC LIMIT 200";

$stmt = db()->prepare($sql);
$stmt->execute($params);

json_response(['items' => $stmt->fetchAll()]);
