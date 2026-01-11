<?php
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

start_session();
json_response(['user' => $_SESSION['user'] ?? null]);
