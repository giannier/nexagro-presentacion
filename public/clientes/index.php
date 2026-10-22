<?php
declare(strict_types=1);

require dirname(__DIR__) . '/api/db.php';

const PAGE_SIZE = 50;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900;

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

session_name('nexagro_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/clientes',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_valid(): bool
{
    $sent = $_POST['csrf'] ?? '';
    return is_string($sent) && isset($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $sent);
}

/** Failed-login timestamps for this IP, kept in a temp file so clearing cookies does not reset them. */
function attempts_file(): string
{
    return sys_get_temp_dir() . '/nexagro_login_' . substr(nexagro_ip_hash(), 0, 32) . '.json';
}

function recent_failures(): array
{
    $file = attempts_file();
    $data = is_file($file) ? json_decode((string) file_get_contents($file), true) : [];
    $cutoff = time() - LOCKOUT_SECONDS;
    return array_values(array_filter(is_array($data) ? $data : [], static fn ($t) => is_int($t) && $t > $cutoff));
}

function record_failure(): void
{
    $failures = recent_failures();
    $failures[] = time();
    file_put_contents(attempts_file(), json_encode($failures), LOCK_EX);
}

function clear_failures(): void
{
    $file = attempts_file();
    if (is_file($file)) {
        unlink($file);
    }
}

function is_locked_out(): bool
{
    return count(recent_failures()) >= MAX_FAILED_ATTEMPTS;
}

/** Prevents spreadsheet formula injection when the CSV is opened in Excel. */
function csv_cell(mixed $value): string
{
    $text = (string) $value;
    if ($text !== '' && strpbrk($text[0], "=+-@\t\r") !== false) {
        $text = "'" . $text;
    }
    return $text;
}

$config = nexagro_config();
$loginError = '';

// --- Logout ------------------------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_POST['action'] ?? '') === 'logout') {
    if (csrf_valid()) {
        $_SESSION = [];
        session_destroy();
    }
    header('Location: /clientes/');
    exit;
}

// --- Login -------------------------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_POST['action'] ?? '') === 'login') {
    if (!csrf_valid()) {
        $loginError = 'La sesión expiró. Inténtalo de nuevo.';
    } elseif (is_locked_out()) {
        $loginError = 'Demasiados intentos. Espera 15 minutos.';
    } else {
        $user = is_string($_POST['username'] ?? null) ? $_POST['username'] : '';
        $pass = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
        $userOk = hash_equals((string) ($config['admin_user'] ?? ''), $user);
        $passOk = password_verify($pass, (string) ($config['admin_pass_hash'] ?? ''));

        if ($userOk && $passOk) {
            clear_failures();
            session_regenerate_id(true);
            $_SESSION['auth'] = true;
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            header('Location: /clientes/');
            exit;
        }

        record_failure();
        sleep(1);
        $loginError = 'Usuario o contraseña incorrectos.';
    }
}

$authenticated = ($_SESSION['auth'] ?? false) === true;

// --- Login screen ------------------------------------------------------------------------
if (!$authenticated) {
    http_response_code($loginError !== '' ? 401 : 200);
    ?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Acceso | NEXAGRO</title>
<style>
  :root { --ink-900:#04050a; --ink-700:#0c1019; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:16px;
         background:#fff; color:var(--ink-900);
         font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing:antialiased; }
  .card { width:100%; max-width:380px; border:1px solid #e5e5e5; border-radius:24px; padding:28px; }
  h1 { margin:0 0 4px; font-size:1.25rem; }
  p.sub { margin:0 0 20px; font-size:.85rem; color:#737373; }
  label { display:block; margin:0 0 6px; font-size:.875rem; font-weight:500; color:#262626; }
  input[type=text], input[type=password] { width:100%; border:1px solid #e5e5e5; border-radius:12px; padding:10px 14px;
         font-size:16px; margin-bottom:16px; outline:none; }
  input:focus { border-color:var(--ink-900); box-shadow:0 0 0 4px #f5f5f5; }
  button { width:100%; border:0; border-radius:16px; background:#171717; color:#fff; padding:14px 20px;
         font-size:.875rem; font-weight:600; cursor:pointer; }
  button:hover { background:#262626; }
  .error { margin:0 0 16px; border-radius:16px; background:#fef2f2; color:#b91c1c; padding:12px 16px; font-size:.875rem; }
</style>
</head>
<body>
<form class="card" method="post" action="/clientes/" autocomplete="off">
  <h1>Clientes NEXAGRO</h1>
  <p class="sub">Acceso restringido.</p>
  <?php if ($loginError !== ''): ?><p class="error" role="alert"><?= e($loginError) ?></p><?php endif; ?>
  <input type="hidden" name="action" value="login">
  <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
  <label for="username">Usuario</label>
  <input id="username" name="username" type="text" required autofocus>
  <label for="password">Contraseña</label>
  <input id="password" name="password" type="password" required>
  <button type="submit">Ingresar</button>
</form>
</body>
</html>
    <?php
    exit;
}

// --- Authenticated: query ----------------------------------------------------------------
$search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
$search = mb_substr($search, 0, 100, 'UTF-8');
$page = max(1, (int) ($_GET['page'] ?? 1));

$where = '';
$params = [];
if ($search !== '') {
    $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search) . '%';
    $columns = ['full_name', 'company_name', 'industry', 'email', 'phone', 'interest_company'];
    $clauses = [];
    foreach ($columns as $i => $column) {
        $clauses[] = "$column LIKE :q$i";
        $params[":q$i"] = $like;
    }
    $where = ' WHERE ' . implode(' OR ', $clauses);
}

try {
    $pdo = nexagro_pdo();

    // CSV export (all rows matching the current search).
    if (($_GET['export'] ?? '') === '1') {
        $stmt = $pdo->prepare(
            'SELECT full_name, job_title, company_name, industry, email, phone, website, instagram, facebook,
                    linkedin, tiktok, notes, interest_company, consent_at, created_at
             FROM contacts' . $where . ' ORDER BY created_at DESC, id DESC'
        );
        $stmt->execute($params);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="nexagro-clientes-' . gmdate('Ymd-His') . '.csv"');
        $out = fopen('php://output', 'wb');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, [
            'Nombre', 'Cargo', 'Empresa', 'Rubro', 'Correo', 'Teléfono', 'Web', 'Instagram', 'Facebook',
            'LinkedIn', 'TikTok', 'Notas', 'Interesado en', 'Autorización', 'Fecha de registro',
        ], ',', '"', '');
        while (($row = $stmt->fetch()) !== false) {
            fputcsv($out, array_map('csv_cell', array_values($row)), ',', '"', '');
        }
        fclose($out);
        exit;
    }

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM contacts' . $where);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
    $pages = max(1, (int) ceil($total / PAGE_SIZE));
    $page = min($page, $pages);
    $offset = ($page - 1) * PAGE_SIZE;

    $stmt = $pdo->prepare(
        'SELECT full_name, company_name, industry, email, phone, interest_company, created_at
         FROM contacts' . $where . ' ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $name => $value) {
        $stmt->bindValue($name, $value, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', PAGE_SIZE, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
} catch (Throwable $exception) {
    error_log('[nexagro] clientes/index.php: ' . get_class($exception) . ': ' . $exception->getMessage());
    http_response_code(500);
    exit('No se pudo cargar la información.');
}

function page_url(int $page, string $search): string
{
    $query = ['page' => $page];
    if ($search !== '') {
        $query['q'] = $search;
    }
    return '/clientes/?' . http_build_query($query);
}
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Clientes | NEXAGRO</title>
<style>
  :root { --ink-900:#04050a; --ink-800:#070911; --ink-700:#0c1019; }
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:var(--ink-900);
         font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing:antialiased; }
  main { max-width:1200px; margin:0 auto; padding:24px 16px 48px; }
  header.top { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; margin-bottom:20px; }
  h1 { margin:0; font-size:1.375rem; }
  .muted { color:#737373; font-size:.85rem; }
  .actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .btn { display:inline-block; border:0; border-radius:16px; background:#171717; color:#fff; padding:10px 18px;
         font-size:.85rem; font-weight:600; text-decoration:none; cursor:pointer; font-family:inherit; }
  .btn:hover { background:#262626; }
  .btn.secondary { background:#fff; color:#171717; border:1px solid #e5e5e5; }
  .btn.secondary:hover { background:#fafafa; }
  form.search { display:flex; gap:8px; margin-bottom:16px; }
  form.search input { flex:1; border:1px solid #e5e5e5; border-radius:12px; padding:10px 14px; font-size:16px; outline:none; }
  form.search input:focus { border-color:var(--ink-900); box-shadow:0 0 0 4px #f5f5f5; }
  .table-wrap { overflow-x:auto; border:1px solid #e5e5e5; border-radius:24px; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; }
  th { text-align:left; padding:12px 16px; font-size:.7rem; letter-spacing:.2em; text-transform:uppercase; color:#a3a3a3; background:#fafafa; white-space:nowrap; }
  td { padding:12px 16px; border-top:1px solid #f0f0f0; vertical-align:top; }
  .empty { padding:32px; text-align:center; color:#737373; }
  nav.pager { display:flex; gap:12px; align-items:center; justify-content:center; margin-top:20px; }
</style>
</head>
<body>
<main>
  <header class="top">
    <div>
      <h1>Clientes registrados</h1>
      <span class="muted"><?= e($total) ?> contacto<?= $total === 1 ? '' : 's' ?><?= $search !== '' ? ' para «' . e($search) . '»' : '' ?></span>
    </div>
    <div class="actions">
      <a class="btn secondary" href="/clientes/?export=1<?= $search !== '' ? '&amp;q=' . e(rawurlencode($search)) : '' ?>">Descargar CSV</a>
      <form method="post" action="/clientes/" style="margin:0">
        <input type="hidden" name="action" value="logout">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <button class="btn" type="submit">Cerrar sesión</button>
      </form>
    </div>
  </header>

  <form class="search" method="get" action="/clientes/" role="search">
    <input type="search" name="q" value="<?= e($search) ?>" placeholder="Buscar por nombre, empresa, rubro, correo o teléfono" aria-label="Buscar">
    <button class="btn" type="submit">Buscar</button>
  </form>

  <div class="table-wrap">
    <?php if ($rows === []): ?>
      <p class="empty">No hay contactos para mostrar.</p>
    <?php else: ?>
    <table>
      <thead>
        <tr><th>Nombre</th><th>Empresa</th><th>Rubro</th><th>Correo</th><th>Teléfono</th><th>Interesado en</th><th>Fecha</th></tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $row): ?>
        <tr>
          <td><?= e($row['full_name']) ?></td>
          <td><?= e($row['company_name']) ?></td>
          <td><?= e($row['industry']) ?></td>
          <td><?= e($row['email']) ?></td>
          <td><?= e($row['phone']) ?></td>
          <td><?= e($row['interest_company']) ?></td>
          <td style="white-space:nowrap"><?= e($row['created_at']) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <?php endif; ?>
  </div>

  <?php if ($pages > 1): ?>
  <nav class="pager" aria-label="Paginación">
    <?php if ($page > 1): ?><a class="btn secondary" href="<?= e(page_url($page - 1, $search)) ?>">Anterior</a><?php endif; ?>
    <span class="muted">Página <?= e($page) ?> de <?= e($pages) ?></span>
    <?php if ($page < $pages): ?><a class="btn secondary" href="<?= e(page_url($page + 1, $search)) ?>">Siguiente</a><?php endif; ?>
  </nav>
  <?php endif; ?>
</main>
</body>
</html>
