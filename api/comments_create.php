<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$user = require_login();
$data = read_json();

$report_id = (int)($data['report_id'] ?? 0);
$comment = trim((string)($data['comment'] ?? ''));

if ($report_id <= 0 || $comment === '') {
  json_response(['error' => 'Hiányzó adatok'], 422);
}

if (mb_strlen($comment) > 2000) {
  json_response(['error' => 'A komment túl hosszú (max 2000 karakter).'], 422);
}

// citizen csak saját reporthoz
if ($user['role'] === 'citizen') {
  $chk = db()->prepare("SELECT id FROM reports WHERE id=? AND user_id=?");
  $chk->execute([$report_id, $user['id']]);
  if (!$chk->fetch()) json_response(['error' => 'Forbidden'], 403);
}

$stmt = db()->prepare("INSERT INTO report_comments(report_id, user_id, comment) VALUES(?,?,?)");
$stmt->execute([$report_id, $user['id'], $comment]);

json_response(['ok' => true, 'id' => (int)db()->lastInsertId()], 201);
