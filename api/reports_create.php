<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$user = require_role(['citizen','staff','admin']);

$data = read_json();
$title = trim($data['title'] ?? '');
$desc = trim($data['description'] ?? '');
$address = trim($data['address'] ?? '');
$category_id = (int)($data['category_id'] ?? 0);

$lat = isset($data['latitude']) ? (float)$data['latitude'] : null;
$lng = isset($data['longitude']) ? (float)$data['longitude'] : null;

if ($title === '' || $desc === '' || $address === '' || $category_id <= 0) {
  json_response(['error' => 'Hiányzó mezők'], 422);
}

if ($lat === null || $lng === null) {
  json_response(['error' => 'A GPS helyzet kötelező.'], 422);
}
if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
  json_response(['error' => 'Hibás koordináta'], 422);
}

$stmt = db()->prepare(
  "INSERT INTO reports(user_id, category_id, title, description, address, latitude, longitude)
   VALUES(?,?,?,?,?,?,?)"
);
$stmt->execute([$user['id'], $category_id, $title, $desc, $address, $lat, $lng]);

json_response(['ok' => true, 'id' => (int)db()->lastInsertId()], 201);
