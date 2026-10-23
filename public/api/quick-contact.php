<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';

nx_headers();
nx_require_post();

const QC_MAX_BODY_BYTES = 4000;
const QC_MAX_INSERTS_PER_HOUR = 30;

function qc_text(mixed $value, int $max): string
{
    if (!is_string($value)) {
        return '';
    }
    return mb_substr((string) preg_replace('/\s+/u', ' ', trim($value)), 0, $max, 'UTF-8');
}

$raw = file_get_contents('php://input', false, null, 0, QC_MAX_BODY_BYTES + 1);
if ($raw === false || strlen($raw) > QC_MAX_BODY_BYTES) {
    nx_respond(413, ['ok' => false, 'message' => 'La solicitud es demasiado grande.']);
}
$input = json_decode($raw, true);
if (!is_array($input)) {
    nx_respond(400, ['ok' => false, 'message' => 'Solicitud no válida.']);
}

$fullName = qc_text($input['fullName'] ?? null, 120);
$phone = qc_text($input['phone'] ?? null, 30);
$industry = qc_text($input['industry'] ?? null, 120);
$interestCompany = qc_text($input['interestCompany'] ?? null, 160);

$missing = [];
if (mb_strlen($fullName, 'UTF-8') < 2) {
    $missing[] = 'fullName';
}
$digits = preg_match_all('/[0-9]/', $phone);
if ($digits < 6 || $digits > 15) {
    $missing[] = 'phone';
}
if (mb_strlen($industry, 'UTF-8') < 2) {
    $missing[] = 'industry';
}
if ($missing !== []) {
    nx_respond(422, ['ok' => false, 'missing' => $missing, 'message' => 'Faltan datos obligatorios.']);
}

try {
    $pdo = nexagro_pdo();
    nx_rate_limit($pdo, 'quick-contact', QC_MAX_INSERTS_PER_HOUR);

    $insert = $pdo->prepare(
        "INSERT INTO contacts
            (full_name, job_title, company_name, industry, email, phone, website,
             instagram, facebook, linkedin, tiktok, notes, interest_company, consent_at, ip_hash)
         VALUES
            (:full_name, '', '', :industry, '', :phone, '', '', '', '', '', NULL, :interest_company, :consent_at, :ip_hash)"
    );
    $insert->execute([
        ':full_name' => $fullName,
        ':industry' => $industry,
        ':phone' => $phone,
        ':interest_company' => $interestCompany,
        ':consent_at' => gmdate('Y-m-d H:i:s'),
        ':ip_hash' => nexagro_ip_hash(),
    ]);

    nx_respond(201, ['ok' => true]);
} catch (Throwable $exception) {
    error_log('[nexagro] quick-contact.php: ' . get_class($exception) . ': ' . $exception->getMessage());
    nx_respond(502, ['ok' => false, 'message' => 'No se pudo guardar el contacto. Inténtalo de nuevo en un momento.']);
}
