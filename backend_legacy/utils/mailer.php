<?php
/**
 * Minimal mail helper.
 * Uses PHP mail() which works on most cPanel setups.
 */

// Optional secrets loader (create config/secrets.php on server; do not commit)
$secretsFile = __DIR__ . '/../config/secrets.php';
if (is_file($secretsFile)) {
    require_once $secretsFile;
}

function _evermore_cfg($envKey, $default = null) {
    $val = getenv($envKey);
    if ($val !== false && $val !== '') return $val;
    if (defined($envKey)) return constant($envKey);
    return $default;
}

function _evermore_encode_subject($subject) {
    // RFC 2047 for UTF-8 subjects
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function _evermore_smtp_read($fp) {
    $data = '';
    while (!feof($fp)) {
        $line = fgets($fp, 515);
        if ($line === false) break;
        $data .= $line;
        // last line has a space after the 3-digit code
        if (preg_match('/^\d{3} /', $line)) break;
    }
    return $data;
}

function _evermore_smtp_cmd($fp, $cmd, $expectCode = null) {
    fwrite($fp, $cmd . "\r\n");
    $resp = _evermore_smtp_read($fp);
    if ($expectCode !== null) {
        if (!preg_match('/^' . preg_quote((string)$expectCode, '/') . '/', $resp)) {
            return [false, $resp];
        }
    }
    return [true, $resp];
}

function send_email_smtp($to, $subject, $bodyText, $bodyHtml = null) {
    $host = _evermore_cfg('EVERMORE_SMTP_HOST');
    if (!$host) return false;

    $port = (int)(_evermore_cfg('EVERMORE_SMTP_PORT', 587));
    $secure = strtolower((string)_evermore_cfg('EVERMORE_SMTP_SECURE', 'starttls')); // ssl|starttls|none
    $user = (string)_evermore_cfg('EVERMORE_SMTP_USER', '');
    $pass = (string)_evermore_cfg('EVERMORE_SMTP_PASS', '');

    $from = (string)_evermore_cfg('EVERMORE_MAIL_FROM', 'no-reply@evermorebrand.com');
    $fromName = (string)_evermore_cfg('EVERMORE_MAIL_FROM_NAME', 'Evermore');

    $transport = ($secure === 'ssl') ? 'ssl://' : '';
    $fp = @stream_socket_client($transport . $host . ':' . $port, $errno, $errstr, 12, STREAM_CLIENT_CONNECT);
    if (!$fp) {
        return false;
    }
    stream_set_timeout($fp, 12);

    $greet = _evermore_smtp_read($fp);
    if (!preg_match('/^220/', $greet)) {
        fclose($fp);
        return false;
    }

    $localHost = isset($_SERVER['SERVER_NAME']) ? (string)$_SERVER['SERVER_NAME'] : 'localhost';
    [$ok] = _evermore_smtp_cmd($fp, 'EHLO ' . $localHost, 250);
    if (!$ok) {
        // try HELO
        [$ok] = _evermore_smtp_cmd($fp, 'HELO ' . $localHost, 250);
        if (!$ok) {
            fclose($fp);
            return false;
        }
    }

    if ($secure === 'starttls') {
        [$ok] = _evermore_smtp_cmd($fp, 'STARTTLS', 220);
        if (!$ok) {
            fclose($fp);
            return false;
        }
        $cryptoOk = @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if ($cryptoOk !== true) {
            fclose($fp);
            return false;
        }
        // re-EHLO after TLS
        [$ok] = _evermore_smtp_cmd($fp, 'EHLO ' . $localHost, 250);
        if (!$ok) {
            fclose($fp);
            return false;
        }
    }

    if ($user !== '' && $pass !== '') {
        [$ok] = _evermore_smtp_cmd($fp, 'AUTH LOGIN', 334);
        if (!$ok) {
            fclose($fp);
            return false;
        }
        [$ok] = _evermore_smtp_cmd($fp, base64_encode($user), 334);
        if (!$ok) {
            fclose($fp);
            return false;
        }
        [$ok] = _evermore_smtp_cmd($fp, base64_encode($pass), 235);
        if (!$ok) {
            fclose($fp);
            return false;
        }
    }

    [$ok] = _evermore_smtp_cmd($fp, 'MAIL FROM:<' . $from . '>', 250);
    if (!$ok) {
        fclose($fp);
        return false;
    }
    [$ok] = _evermore_smtp_cmd($fp, 'RCPT TO:<' . $to . '>', 250);
    if (!$ok) {
        fclose($fp);
        return false;
    }
    [$ok] = _evermore_smtp_cmd($fp, 'DATA', 354);
    if (!$ok) {
        fclose($fp);
        return false;
    }

    $encodedSubject = _evermore_encode_subject($subject);
    $headers = [];
    $headers[] = 'From: ' . sprintf('%s <%s>', $fromName, $from);
    $headers[] = 'To: <' . $to . '>';
    $headers[] = 'Subject: ' . $encodedSubject;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: ' . ($bodyHtml !== null ? 'text/html' : 'text/plain') . '; charset=UTF-8';

    $body = ($bodyHtml !== null) ? $bodyHtml : $bodyText;
    // dot-stuffing
    $body = preg_replace('/\r?\n\./', "\r\n..", str_replace("\r\n", "\n", $body));
    $body = str_replace("\n", "\r\n", $body);

    $data = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n";
    fwrite($fp, $data);
    [$ok] = _evermore_smtp_cmd($fp, '.', 250);
    _evermore_smtp_cmd($fp, 'QUIT', 221);
    fclose($fp);
    return $ok;
}

function send_email_text($to, $subject, $bodyText) {
    return send_email($to, $subject, $bodyText, null);
}

function send_email_html($to, $subject, $bodyHtml, $bodyTextFallback = null) {
    return send_email($to, $subject, $bodyTextFallback ?: strip_tags($bodyHtml), $bodyHtml);
}

/**
 * Send email with optional HTML body.
 * On local Windows + XAMPP, mail() often isn't configured; we return false gracefully.
 */
function send_email($to, $subject, $bodyText, $bodyHtml = null) {
    // Prefer SMTP when configured (more reliable than PHP mail())
    $smtpHost = _evermore_cfg('EVERMORE_SMTP_HOST');
    if ($smtpHost) {
        return send_email_smtp($to, $subject, $bodyText, $bodyHtml);
    }

    $from = _evermore_cfg('EVERMORE_MAIL_FROM', 'no-reply@evermorebrand.com');
    $fromName = _evermore_cfg('EVERMORE_MAIL_FROM_NAME', 'Evermore');

    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'From: ' . sprintf('%s <%s>', $fromName, $from);

    if ($bodyHtml !== null) {
        // Basic HTML email support
        $headers[] = 'Content-Type: text/html; charset=UTF-8';
        $body = $bodyHtml;
    } else {
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $body = $bodyText;
    }

    $headerString = implode("\r\n", $headers);
    return @mail($to, $subject, $body, $headerString);
}
