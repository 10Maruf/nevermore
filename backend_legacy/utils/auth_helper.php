<?php
/**
 * Authentication Helper
 * Purpose: Handle user authentication, token generation, and verification
 */

/**
 * Generate secure random token
 * @return string
 */
function generate_token() {
    return bin2hex(random_bytes(32));
}

/**
 * Hash password using bcrypt
 * @param string $password
 * @return string
 */
function hash_password($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

/**
 * Verify password against hash
 * @param string $password
 * @param string $hash
 * @return bool
 */
function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Get user from authentication token
 * @param mysqli $conn
 * @param string $token
 * @return array|null - User data or null if invalid
 */
function get_user_from_token($conn, $token) {
    $stmt = $conn->prepare("
        SELECT u.id, u.email, u.username, u.role 
        FROM users u
        INNER JOIN session s ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > NOW()
    ");
    
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    
    return null;
}

/**
 * Verify authorization header and return user
 * @param mysqli $conn
 * @return array|null
 */
function verify_auth($conn) {
    $auth_header = null;

    // getallheaders() may return different casing depending on server
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $k => $v) {
                if (strtolower((string)$k) === 'authorization') {
                    $auth_header = $v;
                    break;
                }
            }
        }
    }

    // Fallbacks for Apache/FastCGI
    if ($auth_header === null || $auth_header === '') {
        if (isset($_SERVER['HTTP_AUTHORIZATION']) && $_SERVER['HTTP_AUTHORIZATION'] !== '') {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] !== '') {
            $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
    }

    if ($auth_header === null || $auth_header === '') {
        return null;
    }
    
    // Extract token from "Bearer TOKEN" format
    if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $token = $matches[1];
        return get_user_from_token($conn, $token);
    }
    
    return null;
}

/**
 * Require authentication - send error if not authenticated
 * @param mysqli $conn
 * @return array - User data
 */
function require_auth($conn) {
    require_once __DIR__ . '/response.php';
    
    $user = verify_auth($conn);
    
    if (!$user) {
        send_error('Unauthorized. Please login.', 401);
    }
    
    return $user;
}

?>
