<?php

// Copy to secrets.php for local or server-only secrets (do not commit).
// Prefer environment variables where possible.

define('EVERMORE_SMTP_HOST', 'mail.example.com');
define('EVERMORE_SMTP_PORT', 465); // 465=SSL, 587=STARTTLS usually
define('EVERMORE_SMTP_SECURE', 'ssl'); // 'ssl' | 'starttls' | 'none'
define('EVERMORE_SMTP_USER', 'user@example.com');
define('EVERMORE_SMTP_PASS', 'change-me');

define('EVERMORE_MAIL_FROM', 'user@example.com');
define('EVERMORE_MAIL_FROM_NAME', 'Evermore');

// Optional: database secrets (prefer env vars)
//define('EVERMORE_REMOTE_DB_PASS', 'change-me');
