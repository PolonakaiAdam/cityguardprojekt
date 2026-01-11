<?php
require __DIR__ . '/../app/helpers.php';
require __DIR__ . '/../app/auth.php';

start_session();
session_destroy();
json_response(['ok' => true]);
