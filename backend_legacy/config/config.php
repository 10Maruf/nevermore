<?php
/**
 * Database Configuration File
 * Purpose: Establish MySQL database connection using MySQLi
 * Database: evermore_db
 */

// Enable error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in output
ini_set('log_errors', 1); // Log errors to file instead

// Optional secrets loader (create config/secrets.php on server; do not commit)
$secretsFile = __DIR__ . '/secrets.php';
if (is_file($secretsFile)) {
    require_once $secretsFile;
}

// Optional .env loader (repo root). Keeps local dev setup simple.
$envFile = dirname(__DIR__, 2) . '/.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }
        $name = trim($parts[0]);
        $value = trim($parts[1]);
        if ($name === '') {
            continue;
        }
        if ((strlen($value) >= 2) && (
            ($value[0] === '"' && substr($value, -1) === '"') ||
            ($value[0] === "'" && substr($value, -1) === "'")
        )) {
            $value = substr($value, 1, -1);
        }
        if (getenv($name) === false) {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }
    }
}

// Always respond JSON from API requests
header('Content-Type: application/json');

// Avoid stale/cached API responses (prevents browser disk-cache serving old HTML)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Avoid mysqli throwing exceptions on connect failures (we handle errors manually here)
mysqli_report(MYSQLI_REPORT_OFF);

// Database configuration constants
// Set via env: EVERMORE_IS_PRODUCTION=true/false
$isProduction = filter_var(getenv('EVERMORE_IS_PRODUCTION') ?: '0', FILTER_VALIDATE_BOOLEAN);
define('IS_PRODUCTION', $isProduction);

// Credentials
$remoteHostsRaw = getenv('EVERMORE_REMOTE_DB_HOSTS') ?: (getenv('EVERMORE_REMOTE_DB_HOST') ?: 'evermorebrand.com,144.208.125.220');
$remoteHosts = array_values(array_filter(array_map('trim', preg_split('/[\s,]+/', (string)$remoteHostsRaw))));
$remotePort = (int) (getenv('EVERMORE_REMOTE_DB_PORT') ?: 3306);

$prod = [
    'hosts' => $remoteHosts,
    'port' => $remotePort,
    // NOTE: cPanel MySQL usernames are usually prefixed (e.g. "evermore_evermore")
    'user' => getenv('EVERMORE_REMOTE_DB_USER') ?: 'evermore_evermore',
    'pass' => getenv('EVERMORE_REMOTE_DB_PASS') ?: (defined('EVERMORE_REMOTE_DB_PASS') ? EVERMORE_REMOTE_DB_PASS : ''),
    'name' => getenv('EVERMORE_REMOTE_DB_NAME') ?: 'evermore_evermore_db',
];
$local = [
    'hosts' => [getenv('EVERMORE_LOCAL_DB_HOST') ?: 'localhost'],
    'port' => (int) (getenv('EVERMORE_LOCAL_DB_PORT') ?: 3306),
    'user' => getenv('EVERMORE_LOCAL_DB_USER') ?: 'root',
    'pass' => getenv('EVERMORE_LOCAL_DB_PASS') ?: '',
    'name' => getenv('EVERMORE_LOCAL_DB_NAME') ?: 'evermore_db',
];

// On cPanel/production, DB host is usually localhost (inside server)
if ($isProduction) {
    $prod['hosts'] = [getenv('EVERMORE_PROD_DB_HOST') ?: 'localhost'];
    $prod['port'] = (int) (getenv('EVERMORE_PROD_DB_PORT') ?: 3306);
}

// Create database connection
// Production only: use production DB credentials
$conn = null;
$lastError = '';
$attempts = [];

$dbMode = strtolower(trim(getenv('EVERMORE_DB_MODE') ?: ($isProduction ? 'remote' : 'local')));
if ($dbMode === 'local') {
    $tryOrder = [$local];
} elseif ($dbMode === 'remote') {
    $tryOrder = [$prod];
} else {
    // "auto" or any other value: try local first in dev, remote only in prod.
    $dbMode = $isProduction ? 'remote' : 'auto';
    $tryOrder = $isProduction ? [$prod] : [$local, $prod];
}

foreach ($tryOrder as $candidate) {
    $hosts = isset($candidate['hosts']) && is_array($candidate['hosts']) && count($candidate['hosts'])
        ? $candidate['hosts']
        : ['localhost'];
    $port = (int) ($candidate['port'] ?? 3306);

    foreach ($hosts as $host) {
        $attempts[] = [
            'host' => $host,
            'port' => $port,
            'db' => $candidate['name'],
            'user' => $candidate['user'],
        ];

        $tmp = mysqli_init();
        if ($tmp === false) {
            $lastError = 'mysqli_init failed';
            continue;
        }

        // Keep remote attempts snappy; prevents long hangs when remote MySQL is blocked.
        @mysqli_options($tmp, MYSQLI_OPT_CONNECT_TIMEOUT, 3);

        $ok = @mysqli_real_connect(
            $tmp,
            $host,
            $candidate['user'],
            $candidate['pass'],
            $candidate['name'],
            $port
        );

        if ($ok) {
            $conn = $tmp;
            define('DB_HOST', $host);
            define('DB_USER', $candidate['user']);
            define('DB_PASS', $candidate['pass']);
            define('DB_NAME', $candidate['name']);
            define('DB_PORT', $port);
            break 2;
        }

        $lastError = mysqli_connect_error() ?: 'Unknown connection error';
    }
}

if (!$conn) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $lastError,
        'attempts' => $attempts,
        'mode' => $dbMode
    ]);
    exit;
}

// Set character set to UTF-8
$conn->set_charset("utf8mb4");

// Set timezone
date_default_timezone_set('Asia/Dhaka');

// CORS Headers - Production only
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'https://evermorebrand.com', 
    'http://evermorebrand.com',
    'http://160.250.190.192',
    'https://160.250.190.192'
];

if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
} else {
    // Public endpoints can be accessed without credentials
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

?>
