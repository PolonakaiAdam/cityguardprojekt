<?php
require __DIR__ . '/../app/db.php';
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

$data = read_json();
$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$pass = (string)($data['password'] ?? '');

if ($name === '' || $email === '' || strlen($pass) < 8) {
  json_response(['error' => 'Hibás adatok (jelszó min. 8 karakter)'], 422);
}

$hash = password_hash($pass, PASSWORD_DEFAULT);

try {
  $stmt = db()->prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?, 'citizen')");
  $stmt->execute([$name, $email, $hash]);
  json_response(['ok' => true], 201);
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'Duplicate')) {
    json_response(['error' => 'Ez az email már létezik'], 409);
  }
  json_response(['error' => 'Szerver hiba'], 500);
}
