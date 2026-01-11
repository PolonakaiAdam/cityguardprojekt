<?php
require_once __DIR__ . '/helpers.php';

function start_session(): void {
  $cfg = require __DIR__ . '/../config/config.php';
  session_name($cfg['session_name']);

  // ✅ nagyon fontos: a cookie a /cityguard/ alatt legyen érvényes
  session_set_cookie_params([
    'path' => '/cityguard/',
    'httponly' => true,
    'samesite' => 'Lax'
  ]);

  if (session_status() === PHP_SESSION_NONE) {
    session_start();
  }
}

function require_login(): array {
  start_session();
  if (!isset($_SESSION['user'])) {
    json_response(['error' => 'Unauthorized'], 401);
  }
  return $_SESSION['user'];
}

function require_role(array $roles): array {
  $u = require_login();
  if (!in_array($u['role'], $roles, true)) {
    json_response(['error' => 'Forbidden'], 403);
  }
  return $u;
}
