<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

date_default_timezone_set('UTC');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_BODY_BYTES = 65536;
const MAX_INSERTS_PER_HOUR = 10;

const MAX_LENGTH = [
    'fullName' => 120,
    'jobTitle' => 120,
    'companyName' => 160,
    'industry' => 120,
    'email' => 160,
    'phone' => 30,
    'website' => 200,
    'instagram' => 200,
    'facebook' => 200,
    'linkedin' => 200,
    'tiktok' => 200,
    'notes' => 1000,
    'interestCompany' => 160,
];

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_text(mixed $value, string $field): string
{
    if (!is_string($value)) {
        return '';
    }
    $text = trim($value);
    if ($field !== 'notes') {
        $text = (string) preg_replace('/\s+/u', ' ', $text);
    }
    return mb_substr($text, 0, MAX_LENGTH[$field], 'UTF-8');
}

/** Accepts `empresa.com` as well as a full URL; returns the normalised form or null. */
function normalise_website(string $value): ?string
{
    $candidate = preg_match('#^https?://#i', $value) === 1 ? $value : 'https://' . $value;
    $parts = parse_url($candidate);
    if ($parts === false || !isset($parts['host'])) {
        return null;
    }
    $host = strtolower($parts['host']);
    if (!str_contains($host, '.') || preg_match('/^[\p{L}\p{N}.-]+$/u', $host) !== 1) {
        return null;
    }
    $url = strtolower($parts['scheme'] ?? 'https') . '://' . $host;
    if (isset($parts['port'])) {
        $url .= ':' . $parts['port'];
    }
    $url .= ($parts['path'] ?? '') === '' ? '/' : $parts['path'];
    if (isset($parts['query'])) {
        $url .= '?' . $parts['query'];
    }
    if (isset($parts['fragment'])) {
        $url .= '#' . $parts['fragment'];
    }
    return $url;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'Método no permitido.']);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if ($raw === false || strlen($raw) > MAX_BODY_BYTES) {
    respond(400, ['ok' => false, 'message' => 'Solicitud no válida.']);
}
$input = json_decode($raw, true);
if (!is_array($input)) {
    respond(400, ['ok' => false, 'message' => 'Solicitud no válida.']);
}

// Honeypot: bots fill it, people never see it. Pretend success and save nothing.
if (isset($input['nickname']) && is_string($input['nickname']) && trim($input['nickname']) !== '') {
    respond(200, ['ok' => true]);
}

$values = [];
foreach (array_keys(MAX_LENGTH) as $field) {
    $values[$field] = read_text($input[$field] ?? null, $field);
}

$errors = [];

if (mb_strlen($values['fullName'], 'UTF-8') < 2) {
    $errors['fullName'] = 'Ingresa el nombre de la persona.';
}
if (mb_strlen($values['companyName'], 'UTF-8') < 2) {
    $errors['companyName'] = 'Ingresa el nombre de la empresa.';
}
if (mb_strlen($values['industry'], 'UTF-8') < 2) {
    $errors['industry'] = 'Indica el área o rubro de la empresa.';
}

if ($values['email'] !== '' && preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u', $values['email']) !== 1) {
    $errors['email'] = 'El correo no es válido.';
}

if ($values['phone'] !== '') {
    $digits = preg_match_all('/[0-9]/', $values['phone']);
    if ($digits < 6 || $digits > 15) {
        $errors['phone'] = 'El teléfono no es válido.';
    }
}

// A contact nobody can reach is not a contact.
if ($values['email'] === '' && $values['phone'] === '') {
    $errors['email'] = 'Ingresa al menos un correo o un teléfono.';
}

if ($values['website'] !== '') {
    $website = normalise_website($values['website']);
    if ($website === null) {
        $errors['website'] = 'La página web no es válida.';
    } else {
        $values['website'] = mb_substr($website, 0, MAX_LENGTH['website'], 'UTF-8');
    }
}

if ($errors !== []) {
    respond(422, ['ok' => false, 'errors' => $errors]);
}

try {
    $pdo = nexagro_pdo();
    $ipHash = nexagro_ip_hash();

    $count = $pdo->prepare(
        'SELECT COUNT(*) FROM contacts WHERE ip_hash = :ip_hash AND created_at >= (NOW() - INTERVAL 1 HOUR)'
    );
    $count->execute([':ip_hash' => $ipHash]);
    if ((int) $count->fetchColumn() >= MAX_INSERTS_PER_HOUR) {
        respond(429, ['ok' => false, 'message' => 'Demasiados registros. Inténtalo más tarde.']);
    }

    $insert = $pdo->prepare(
        'INSERT INTO contacts
            (full_name, job_title, company_name, industry, email, phone, website,
             instagram, facebook, linkedin, tiktok, notes, interest_company, consent_at, ip_hash)
         VALUES
            (:full_name, :job_title, :company_name, :industry, :email, :phone, :website,
             :instagram, :facebook, :linkedin, :tiktok, :notes, :interest_company, :consent_at, :ip_hash)'
    );
    $insert->execute([
        ':full_name' => $values['fullName'],
        ':job_title' => $values['jobTitle'],
        ':company_name' => $values['companyName'],
        ':industry' => $values['industry'],
        ':email' => $values['email'],
        ':phone' => $values['phone'],
        ':website' => $values['website'],
        ':instagram' => $values['instagram'],
        ':facebook' => $values['facebook'],
        ':linkedin' => $values['linkedin'],
        ':tiktok' => $values['tiktok'],
        ':notes' => $values['notes'] === '' ? null : $values['notes'],
        ':interest_company' => $values['interestCompany'],
        ':consent_at' => gmdate('Y-m-d H:i:s'),
        ':ip_hash' => $ipHash,
    ]);

    respond(200, ['ok' => true]);
} catch (Throwable $exception) {
    error_log('[nexagro] contacts.php: ' . get_class($exception) . ': ' . $exception->getMessage());
    respond(500, ['ok' => false, 'message' => 'No se pudo guardar el contacto.']);
}
