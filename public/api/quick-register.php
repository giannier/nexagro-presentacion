<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';

nx_headers();
nx_require_post();

const QR_MAX_BODY_BYTES = 20000;
const QR_MAX_TRANSCRIPT_CHARS = 4000;
const QR_MAX_CALLS_PER_HOUR = 120;
const QR_TIMEOUT_SECONDS = 15;
const QR_FIELD_KEYS = ['fullName', 'phone', 'industry'];

$raw = file_get_contents('php://input', false, null, 0, QR_MAX_BODY_BYTES + 1);
if ($raw === false || strlen($raw) > QR_MAX_BODY_BYTES) {
    nx_respond(413, ['ok' => false, 'message' => 'La transcripción es demasiado larga.']);
}
$input = json_decode($raw, true);
$transcript = is_array($input) && is_string($input['transcript'] ?? null) ? trim($input['transcript']) : '';
if ($transcript === '') {
    nx_respond(400, ['ok' => false, 'message' => 'Solicitud no válida.']);
}
if (mb_strlen($transcript, 'UTF-8') > QR_MAX_TRANSCRIPT_CHARS) {
    nx_respond(413, ['ok' => false, 'message' => 'La transcripción es demasiado larga.']);
}
$interestCompany = is_array($input) && is_string($input['interestCompany'] ?? null)
    ? mb_substr(trim($input['interestCompany']), 0, 160, 'UTF-8')
    : '';

try {
    $url = nx_webhook_url('n8n_quick_register_url');
    if ($url === null) {
        error_log('[nexagro] quick-register: n8n_quick_register_url is not configured.');
        nx_respond(503, ['ok' => false, 'message' => 'El registro rápido aún no está conectado.']);
    }

    nx_rate_limit(nexagro_pdo(), 'quick-register', QR_MAX_CALLS_PER_HOUR);

    $workflow = nx_forward(
        $url,
        json_encode(['transcript' => $transcript, 'interestCompany' => $interestCompany], JSON_UNESCAPED_UNICODE),
        QR_TIMEOUT_SECONDS,
        ['Content-Type: application/json']
    );
} catch (Throwable $exception) {
    error_log('[nexagro] quick-register.php: ' . get_class($exception) . ': ' . $exception->getMessage());
    nx_respond(500, ['ok' => false, 'message' => 'No se pudo procesar la solicitud.']);
}

if ($workflow === null) {
    nx_respond(502, ['ok' => false, 'message' => 'No se pudo procesar el audio.']);
}
if (!is_array($workflow['fields'] ?? null)) {
    error_log('[nexagro] quick-register: unexpected workflow response shape.');
    nx_respond(502, ['ok' => false, 'message' => 'Respuesta inesperada del registro rápido.']);
}

$fields = [];
foreach (QR_FIELD_KEYS as $key) {
    $fields[$key] = is_string($workflow['fields'][$key] ?? null) ? $workflow['fields'][$key] : '';
}

nx_respond(200, ['ok' => true, 'fields' => $fields, 'missing' => nx_string_list($workflow['missing'] ?? [])]);
