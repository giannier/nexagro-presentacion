<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';

nx_headers();
nx_require_post();

const VC_MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const VC_MAX_CALLS_PER_HOUR = 20;
const VC_TIMEOUT_SECONDS = 40;

const VC_CONTACT_FIELDS = [
    'fullName', 'jobTitle', 'companyName', 'industry', 'email', 'phone', 'website',
    'instagram', 'facebook', 'linkedin', 'tiktok', 'notes', 'interestCompany',
];

/**
 * Detected (finfo) MIME type -> extension used for the forwarded file name. libmagic
 * reports the WebM/MP4 containers MediaRecorder produces as video/* even for audio-only
 * recordings, so those are accepted too.
 */
const VC_ALLOWED_TYPES = [
    'audio/webm' => 'webm',
    'video/webm' => 'webm',
    'audio/ogg' => 'ogg',
    'application/ogg' => 'ogg',
    'audio/mp4' => 'm4a',
    'video/mp4' => 'm4a',
    'audio/x-m4a' => 'm4a',
    'audio/mpeg' => 'mp3',
    'audio/wav' => 'wav',
    'audio/x-wav' => 'wav',
];

// A multipart body above post_max_size arrives with empty $_FILES: report it as 413.
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > VC_MAX_AUDIO_BYTES + 262144) {
    nx_respond(413, ['ok' => false, 'message' => 'La grabación es demasiado larga.']);
}

$cleanup = false;
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (str_starts_with($contentType, 'multipart/form-data')) {
    $file = $_FILES['audio'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) $file['tmp_name'])) {
        nx_respond(400, ['ok' => false, 'message' => 'No se recibió audio.']);
    }
    if ((int) $file['size'] > VC_MAX_AUDIO_BYTES) {
        nx_respond(413, ['ok' => false, 'message' => 'La grabación es demasiado larga.']);
    }
    $tmpPath = (string) $file['tmp_name'];
} else {
    // The site's recorder posts the raw audio blob as the request body.
    $audio = file_get_contents('php://input', false, null, 0, VC_MAX_AUDIO_BYTES + 1);
    if ($audio === false || $audio === '') {
        nx_respond(400, ['ok' => false, 'message' => 'No se recibió audio.']);
    }
    if (strlen($audio) > VC_MAX_AUDIO_BYTES) {
        nx_respond(413, ['ok' => false, 'message' => 'La grabación es demasiado larga.']);
    }
    $tmpPath = tempnam(sys_get_temp_dir(), 'nxvoice_');
    if ($tmpPath === false || file_put_contents($tmpPath, $audio) === false) {
        nx_respond(500, ['ok' => false, 'message' => 'No se pudo procesar la solicitud.']);
    }
    $cleanup = true;
    unset($audio);
}

register_shutdown_function(static function () use ($tmpPath, $cleanup): void {
    if ($cleanup && is_file($tmpPath)) {
        @unlink($tmpPath);
    }
});

// Trust the bytes, not the client-supplied header.
$finfo = new finfo(FILEINFO_MIME_TYPE);
$detected = strtolower((string) $finfo->file($tmpPath));
if (!isset(VC_ALLOWED_TYPES[$detected])) {
    nx_respond(415, ['ok' => false, 'message' => 'Formato de audio no admitido.']);
}

try {
    $url = nx_webhook_url('n8n_voice_contact_url');
    if ($url === null) {
        error_log('[nexagro] voice-contact: n8n_voice_contact_url is not configured.');
        nx_respond(503, ['ok' => false, 'message' => 'El registro por voz aún no está conectado.']);
    }

    nx_rate_limit(nexagro_pdo(), 'voice-contact', VC_MAX_CALLS_PER_HOUR);

    $workflow = nx_forward(
        $url,
        ['audio' => new CURLFile($tmpPath, $detected, 'recording.' . VC_ALLOWED_TYPES[$detected])],
        VC_TIMEOUT_SECONDS
    );
} catch (Throwable $exception) {
    error_log('[nexagro] voice-contact.php: ' . get_class($exception) . ': ' . $exception->getMessage());
    nx_respond(500, ['ok' => false, 'message' => 'No se pudo procesar la solicitud.']);
}

if ($workflow === null) {
    nx_respond(502, ['ok' => false, 'message' => 'No se pudo procesar el audio. Inténtalo de nuevo.']);
}
if (!is_string($workflow['transcript'] ?? null) || !is_array($workflow['fields'] ?? null)) {
    error_log('[nexagro] voice-contact: unexpected workflow response shape.');
    nx_respond(502, ['ok' => false, 'message' => 'El registro por voz devolvió una respuesta inesperada.']);
}

$fields = [];
foreach (VC_CONTACT_FIELDS as $key) {
    $fields[$key] = is_string($workflow['fields'][$key] ?? null) ? $workflow['fields'][$key] : '';
}

nx_respond(200, [
    'ok' => true,
    'transcript' => $workflow['transcript'],
    'fields' => $fields,
    'missing' => nx_string_list($workflow['missing'] ?? []),
]);
