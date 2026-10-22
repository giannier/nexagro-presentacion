<?php
declare(strict_types=1);

/**
 * Shared configuration loader and PDO factory.
 * Defines functions only; it never prints anything, and api/.htaccess blocks direct access.
 */

/** Loads the private config that lives OUTSIDE the web root. */
function nexagro_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $candidates = ['/home/nexagroe/nexagro-config/config.php'];
    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && $documentRoot !== '') {
        $candidates[] = dirname(rtrim($documentRoot, '/\\')) . '/nexagro-config/config.php';
    }

    foreach ($candidates as $path) {
        if (is_file($path) && is_readable($path)) {
            $loaded = require $path;
            if (is_array($loaded)) {
                $config = $loaded;
                return $config;
            }
        }
    }

    throw new RuntimeException('NEXAGRO config file not found or invalid.');
}

/** Returns a shared PDO connection (exceptions on error, real prepared statements). */
function nexagro_pdo(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = nexagro_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'] ?? 'localhost',
        $config['db_name'] ?? ''
    );

    $pdo = new PDO($dsn, (string) ($config['db_user'] ?? ''), (string) ($config['db_pass'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

/** Salted SHA-256 of the client IP. The raw IP is never stored. */
function nexagro_ip_hash(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $salt = (string) (nexagro_config()['ip_salt'] ?? '');
    return hash('sha256', $ip . $salt);
}
