<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$user = require_role(['staff','admin']);

$data = read_json();
$report_id = (int)($data['report_id'] ?? 0);
$status = (string)($data['status'] ?? '');

$allowed = ['new','in_progress','resolved','rejected'];
if ($report_id <= 0 || !in_array($status, $allowed, true)) {
  json_response(['error' => 'Hibás adatok'], 422);
}

$stmt = db()->prepare("UPDATE reports SET status=? WHERE id=?");
$stmt->execute([$status, $report_id]);

json_response(['ok' => true]);
