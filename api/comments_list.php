<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$user = require_login();
$report_id = (int)($_GET['report_id'] ?? 0);
if ($report_id <= 0) json_response(['error' => 'Hiányzó report_id'], 422);

// citizen csak a saját reportjához
if ($user['role'] === 'citizen') {
  $chk = db()->prepare("SELECT id FROM reports WHERE id=? AND user_id=?");
  $chk->execute([$report_id, $user['id']]);
  if (!$chk->fetch()) json_response(['error' => 'Forbidden'], 403);
}

$stmt = db()->prepare(
  "SELECT rc.id, rc.comment, rc.created_at, u.name AS author, u.role AS author_role
   FROM report_comments rc
   JOIN users u ON u.id = rc.user_id
   WHERE rc.report_id=?
   ORDER BY rc.created_at ASC"
);
$stmt->execute([$report_id]);

json_response(['items' => $stmt->fetchAll()]);
