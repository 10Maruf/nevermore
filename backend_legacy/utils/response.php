<?php
/**
 * Response Helper Utility
 * Purpose: Standardize JSON responses across all API endpoints
 */

/**
 * Send standardized JSON response
 * @param bool $success - Success status
 * @param string $message - Response message
 * @param mixed $data - Optional data to return
 * @param int $code - HTTP status code
 */
function send_json($success, $message, $data = null, $code = 200) {
    http_response_code($code);
    
    $response = [
        'status' => $success ? 'success' : 'error',
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }

    // Make URLs easier to copy/paste from responses during testing
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Send error response
 * @param string $message - Error message
 * @param int $code - HTTP status code (default 400)
 */
function send_error($message, $code = 400) {
    send_json(false, $message, null, $code);
}

/**
 * Send success response
 * @param string $message - Success message
 * @param mixed $data - Optional data to return
 */
function send_success($message, $data = null) {
    send_json(true, $message, $data, 200);
}

?>
