<?php
/**
 * TEMPLATE. Copy to /home/nexagroe/nexagro-config/config.php (OUTSIDE public_html),
 * fill in the real values, and never commit the real file.
 *
 * Generate the admin password hash on any machine with PHP:
 *   php -r "echo password_hash('PASSWORD', PASSWORD_DEFAULT);"
 * Paste the output (it starts with $2y$) into admin_pass_hash, between single quotes.
 * Generate ip_salt with:  php -r "echo bin2hex(random_bytes(32));"
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'nexagroe_CHANGE_ME',
    'db_user' => 'nexagroe_CHANGE_ME',
    'db_pass' => 'CHANGE_ME',
    'admin_user' => 'admin',
    'admin_pass_hash' => 'PASTE_PASSWORD_HASH_HERE',
    'ip_salt' => 'PASTE_RANDOM_STRING_HERE',
    // n8n voice workflows. The secret must equal REPLACE_WITH_SHARED_SECRET inside the
    // imported n8n workflow:  php -r "echo bin2hex(random_bytes(32));"
    'n8n_secret' => 'PASTE_RANDOM_STRING_HERE',
    'n8n_quick_register_url' => 'https://YOUR-N8N-HOST/webhook/nexagro-quick-register',
    'n8n_voice_contact_url' => 'https://YOUR-N8N-HOST/webhook/voice-contact',
];
