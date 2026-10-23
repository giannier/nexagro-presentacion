<?php
declare(strict_types=1);

/**
 * Shared helpers for the voice endpoints (quick-register, voice-contact, quick-contact).
 * Include-only: api/.htaccess blocks direct access. Requires db.php to be loaded first.
 */

function nx_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

function nx_respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function nx_require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        nx_respond(405, ['ok' => false, 'message' => 'Método no permitido.']);
    }
}

/**
 * Rolling one-hour limit per hashed IP and endpoint, backed by the `api_calls` table.
 * Records the call when allowed. Exits with 429 when the limit is reached.
 */
function nx_rate_limit(PDO $pdo, string $endpoint, int $maxPerHour): void
{
    $ipHash = nexagro_ip_hash();

    $count = $pdo->prepare(
        'SELECT COUNT(*) FROM api_calls
         WHERE endpoint = :endpoint AND ip_hash = :ip_hash AND created_at >= (NOW() - INTERVAL 1 HOUR)'
    );
    $count->execute([':endpoint' => $endpoint, ':ip_hash' => $ipHash]);
    if ((int) $count->fetchColumn() >= $maxPerHour) {
        nx_respond(429, ['ok' => false, 'message' => 'Demasiadas solicitudes. Inténtalo más tarde.']);
    }

    $insert = $pdo->prepare('INSERT INTO api_calls (endpoint, ip_hash) VALUES (:endpoint, :ip_hash)');
    $insert->execute([':endpoint' => $endpoint, ':ip_hash' => $ipHash]);

    // Housekeeping: about 1 call in 50 prunes rows older than a day.
    if (random_int(1, 50) === 1) {
        $pdo->exec('DELETE FROM api_calls WHERE created_at < (NOW() - INTERVAL 1 DAY)');
    }
}

/** Returns the configured n8n webhook URL, or null while it is missing or still a placeholder. */
function nx_webhook_url(string $key): ?string
{
    $url = trim((string) (nexagro_config()[$key] ?? ''));
    if ($url === '' || stripos($url, 'YOUR-N8N-HOST') !== false) {
        return null;
    }
    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    return in_array($scheme, ['http', 'https'], true) ? $url : null;
}

/**
 * POSTs to n8n with the shared secret. Returns the decoded JSON array, or null on any
 * failure (network, non-2xx, bad JSON). Never follows redirects, so the secret cannot
 * be bounced to another host.
 *
 * @param array<string, mixed>|string $body JSON string, or an array (multipart/CURLFile).
 * @param list<string> $extraHeaders
 */
function nx_forward(string $url, array|string $body, int $timeoutSeconds, array $extraHeaders = []): ?array
{
    $secret = (string) (nexagro_config()['n8n_secret'] ?? '');
    if ($secret === '' || !function_exists('curl_init')) {
        error_log('[nexagro] n8n_secret missing or cURL unavailable.');
        return null;
    }

    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => $timeoutSeconds,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => array_merge(['x-nexagro-secret: ' . $secret, 'Accept: application/json'], $extraHeaders),
    ]);
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $error = curl_errno($curl) !== 0 ? curl_error($curl) : '';
    curl_close($curl);

    if ($raw === false || $status < 200 || $status >= 300) {
        error_log('[nexagro] n8n call failed: status ' . $status . ($error !== '' ? ' curl: ' . $error : ''));
        return null;
    }
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : null;
}

/** @return list<string> */
function nx_string_list(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }
    return array_values(array_filter($value, static fn ($entry) => is_string($entry)));
}

/**
 * Keeps digits only. A leading "+" survives only when there are enough digits for a country
 * code plus a 9-digit Peruvian mobile (11+): the speech pipeline sometimes prefixes a "+" to
 * a number dictated digit by digit, which would otherwise read as a bogus country code.
 */
function nx_clean_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    return (str_starts_with(trim($phone), '+') && strlen($digits) >= 11) ? '+' . $digits : $digits;
}
