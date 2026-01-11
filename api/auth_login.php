<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$data = read_json();
$email = trim($data['email'] ?? '');
$pass = (string)($data['password'] ?? '');

$stmt = db()->prepare("SELECT id,name,email,role,password_hash FROM users WHERE email=? LIMIT 1");
$stmt->execute([$email]);
$u = $stmt->fetch();

if (!$u || !password_verify($pass, $u['password_hash'])) {
  json_response(['error' => 'Hibás email vagy jelszó'], 401);
}

start_session();
$_SESSION['user'] = [
  'id' => $u['id'],
  'name' => $u['name'],
  'email' => $u['email'],
  'role' => $u['role'],
];

json_response(['ok' => true]);
