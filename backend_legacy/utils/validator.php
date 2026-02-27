<?php
/**
 * Validator Utility
 * Purpose: Validate input data before processing
 */

/**
 * Validate email format
 * @param string $email
 * @return bool
 */
function validate_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate password strength
 * @param string $password
 * @return array ['valid' => bool, 'message' => string]
 */
function validate_password($password) {
    if (strlen($password) < 6) {
        return ['valid' => false, 'message' => 'Password must be at least 6 characters'];
    }
    return ['valid' => true, 'message' => 'Valid password'];
}

/**
 * Sanitize string input
 * @param string $input
 * @return string
 */
function sanitize_string($input) {
    return htmlspecialchars(strip_tags(trim($input)));
}

/**
 * Validate required fields
 * @param array $data - Input data
 * @param array $required_fields - List of required field names
 * @return array ['valid' => bool, 'missing' => array]
 */
function validate_required_fields($data, $required_fields) {
    $missing = [];
    
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $missing[] = $field;
        }
    }
    
    return [
        'valid' => empty($missing),
        'missing' => $missing
    ];
}

/**
 * Validate positive integer
 * @param mixed $value
 * @return bool
 */
function validate_positive_int($value) {
    return is_numeric($value) && intval($value) > 0;
}

?>
