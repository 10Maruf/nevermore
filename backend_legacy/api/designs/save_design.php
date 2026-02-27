<?php
// Clean output buffer
ob_start();

// Suppress errors in output
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');
ob_clean();

require_once '../../config/config.php';
require_once '../../utils/auth_helper.php';
require_once '../../utils/response.php';

// Verify user is authenticated
$user = require_auth($conn);
$user_id = $user['id'];

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    send_error('Invalid JSON input', 400);
}

// Validate required fields
if (empty($input['design_name'])) {
    send_error('Design name is required', 400);
}

if (empty($input['design_data'])) {
    send_error('Design data is required', 400);
}

$design_name = trim($input['design_name']);
$design_data = json_encode($input['design_data']); // Convert to JSON string for MySQL
$preview_image = $input['preview_image'] ?? null; // Base64 encoded image
$garment_type = $input['garment_type'] ?? 'T-Shirt';
$garment_color = $input['garment_color'] ?? '#FFFFFF';
$garment_size = $input['garment_size'] ?? 'M';
$technique = $input['technique'] ?? 'Print';
$print_type = $input['print_type'] ?? null;
$embroidery_type = $input['embroidery_type'] ?? null;
$design_id = $input['design_id'] ?? null; // If updating existing design
$asset_ids = $input['asset_ids'] ?? []; // Array of asset IDs used in this design

// Begin transaction
$conn->begin_transaction();

try {
    // Sanitize design name for filename (remove special characters, replace spaces with underscores)
    $safe_design_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', str_replace(' ', '_', $design_name));
    $safe_design_name = substr($safe_design_name, 0, 50); // Limit length
    
    // For updates, we can use the design_id immediately
    // For new designs, we'll save with temp name first, then rename after getting design_id
    $temp_preview_path = null;
    $preview_url = null;
    
    if ($preview_image) {
        // Remove data:image/png;base64, prefix if present
        $preview_image = preg_replace('/^data:image\/\w+;base64,/', '', $preview_image);
        $preview_data = base64_decode($preview_image);
        
        if ($preview_data) {
            $preview_dir = '../../uploads/previews/';
            
            // Create directory if it doesn't exist
            if (!file_exists($preview_dir)) {
                mkdir($preview_dir, 0777, true);
            }
            
            if ($design_id) {
                // Updating existing design - use proper format immediately
                $preview_filename = $user_id . '_' . $design_id . '_' . $safe_design_name . '.png';
                $preview_path = $preview_dir . $preview_filename;
                
                // Delete old preview if exists
                $old_stmt = $conn->prepare("SELECT preview_url FROM custom_designs WHERE id = ? AND user_id = ?");
                $old_stmt->bind_param("ii", $design_id, $user_id);
                $old_stmt->execute();
                $old_result = $old_stmt->get_result();
                if ($old_row = $old_result->fetch_assoc()) {
                    if ($old_row['preview_url']) {
                        $old_file = '../../' . ltrim($old_row['preview_url'], '/');
                        if (file_exists($old_file)) {
                            unlink($old_file);
                        }
                    }
                }
                $old_stmt->close();
                
                if (file_put_contents($preview_path, $preview_data)) {
                    $preview_url = '/backend/uploads/previews/' . $preview_filename;
                }
            } else {
                // New design - save with temp name first
                $temp_filename = 'temp_' . $user_id . '_' . time() . '.png';
                $temp_preview_path = $preview_dir . $temp_filename;
                if (file_put_contents($temp_preview_path, $preview_data)) {
                    $preview_url = '/backend/uploads/previews/' . $temp_filename;
                }
            }
        }
    }
    
    // Check if a design with the same name already exists for this user (if no design_id provided)
    if (!$design_id) {
        $check_stmt = $conn->prepare("SELECT id FROM custom_designs WHERE user_id = ? AND design_name = ?");
        $check_stmt->bind_param("is", $user_id, $design_name);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($existing_design = $check_result->fetch_assoc()) {
            // Design with same name exists, use it as design_id to update
            $design_id = $existing_design['id'];
        }
        $check_stmt->close();
    }
    
    if ($design_id) {
        // Update existing design
        $stmt = $conn->prepare("
            UPDATE custom_designs
            SET design_name = ?,
                preview_url = ?,
                garment_type = ?,
                garment_color = ?,
                garment_size = ?,
                technique = ?,
                print_type = ?,
                embroidery_type = ?,
                design_data = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ");
        
        $stmt->bind_param("sssssssssii", 
            $design_name, $preview_url, $garment_type, $garment_color,
            $garment_size, $technique, $print_type, $embroidery_type,
            $design_data, $design_id, $user_id
        );
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to update design');
        }
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Design not found or unauthorized');
        }
        
        $saved_design_id = $design_id;
        $stmt->close();
        
        // Delete old assets that are not in the new asset_ids list
        if (!empty($asset_ids) && is_array($asset_ids)) {
            $placeholders = str_repeat('?,', count($asset_ids) - 1) . '?';
            $delete_old_assets_stmt = $conn->prepare("
                DELETE FROM design_assets 
                WHERE design_id = ? AND user_id = ? AND id NOT IN ($placeholders)
            ");
            
            $types = 'ii' . str_repeat('i', count($asset_ids));
            $params = array_merge([$design_id, $user_id], $asset_ids);
            $delete_old_assets_stmt->bind_param($types, ...$params);
            $delete_old_assets_stmt->execute();
            $delete_old_assets_stmt->close();
        } else {
            // No assets in new design, delete all old assets
            $delete_all_assets_stmt = $conn->prepare("
                SELECT asset_url FROM design_assets WHERE design_id = ? AND user_id = ?
            ");
            $delete_all_assets_stmt->bind_param("ii", $design_id, $user_id);
            $delete_all_assets_stmt->execute();
            $old_assets_result = $delete_all_assets_stmt->get_result();
            
            while ($old_asset = $old_assets_result->fetch_assoc()) {
                $old_file = '../../' . ltrim($old_asset['asset_url'], '/');
                if (file_exists($old_file)) {
                    unlink($old_file);
                }
            }
            $delete_all_assets_stmt->close();
            
            $delete_stmt = $conn->prepare("DELETE FROM design_assets WHERE design_id = ? AND user_id = ?");
            $delete_stmt->bind_param("ii", $design_id, $user_id);
            $delete_stmt->execute();
            $delete_stmt->close();
        }
        
    } else {
        // Create new design
        $stmt = $conn->prepare("
            INSERT INTO custom_designs (
                user_id, design_name, preview_url, garment_type, garment_color,
                garment_size, technique, print_type, embroidery_type, design_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->bind_param("isssssssss",
            $user_id, $design_name, $preview_url, $garment_type, $garment_color,
            $garment_size, $technique, $print_type, $embroidery_type, $design_data
        );
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to create design');
        }
        
        $saved_design_id = $stmt->insert_id;
        $stmt->close();
        
        // Now rename the temp preview file with proper format
        if ($temp_preview_path && file_exists($temp_preview_path)) {
            $preview_dir = '../../uploads/previews/';
            $final_filename = $user_id . '_' . $saved_design_id . '_' . $safe_design_name . '.png';
            $final_path = $preview_dir . $final_filename;
            
            if (rename($temp_preview_path, $final_path)) {
                $preview_url = '/backend/uploads/previews/' . $final_filename;
                
                // Update the preview_url in database
                $update_stmt = $conn->prepare("UPDATE custom_designs SET preview_url = ? WHERE id = ?");
                $update_stmt->bind_param("si", $preview_url, $saved_design_id);
                $update_stmt->execute();
                $update_stmt->close();
            }
        }
    }
    
    // Update asset_ids to link them with this design and rename files with proper format
    $asset_url_map = []; // Track old URL => new URL mapping
    if (!empty($asset_ids) && is_array($asset_ids)) {
        error_log("Processing " . count($asset_ids) . " assets for design $saved_design_id");
        $asset_number = 1;
        
        foreach ($asset_ids as $asset_id) {
            // Get current asset info
            $get_stmt = $conn->prepare("SELECT asset_url FROM design_assets WHERE id = ? AND user_id = ?");
            $get_stmt->bind_param("ii", $asset_id, $user_id);
            $get_stmt->execute();
            $asset_result = $get_stmt->get_result();
            
            if ($asset_row = $asset_result->fetch_assoc()) {
                $old_asset_url = $asset_row['asset_url'];
                // Remove leading slash and 'backend/' from the URL to get correct relative path
                // URL format: /backend/uploads/designs/file.jpg
                // We need: ../../uploads/designs/file.jpg (from backend/api/designs/)
                $old_path = str_replace('/backend/', '../../', $old_asset_url);
                
                error_log("Old path: $old_path, exists: " . (file_exists($old_path) ? 'yes' : 'no'));
                
                // Get file extension
                $extension = pathinfo($old_path, PATHINFO_EXTENSION);
                
                // Create new filename: userid_designid_assetnumber.ext
                $new_filename = $user_id . '_' . $saved_design_id . '_asset' . $asset_number . '.' . $extension;
                $new_path = '../../uploads/designs/' . $new_filename;
                $new_asset_url = '/backend/uploads/designs/' . $new_filename;
                
                error_log("New path: $new_path, new URL: $new_asset_url");
                
                // Rename the file if it exists
                if (file_exists($old_path)) {
                    if (rename($old_path, $new_path)) {
                        error_log("Successfully renamed asset $asset_id to $new_filename");
                        
                        // Track the URL mapping for updating design_data
                        $asset_url_map[$old_asset_url] = $new_asset_url;
                        
                        // Update database with new URL and link to design
                        $update_stmt = $conn->prepare("
                            UPDATE design_assets
                            SET design_id = ?, asset_url = ?
                            WHERE id = ? AND user_id = ?
                        ");
                        $update_stmt->bind_param("isii", $saved_design_id, $new_asset_url, $asset_id, $user_id);
                        
                        if (!$update_stmt->execute()) {
                            error_log("Failed to update asset: " . $update_stmt->error);
                        }
                        
                        $update_stmt->close();
                        $asset_number++;
                    } else {
                        error_log("Failed to rename asset file: $old_path to $new_path");
                    }
                } else {
                    error_log("File doesn't exist at $old_path, just updating design_id");
                    // File doesn't exist, just update design_id
                    $update_stmt = $conn->prepare("UPDATE design_assets SET design_id = ? WHERE id = ? AND user_id = ?");
                    $update_stmt->bind_param("iii", $saved_design_id, $asset_id, $user_id);
                    $update_stmt->execute();
                    $update_stmt->close();
                }
            }
            
            $get_stmt->close();
        }
        
        // Update design_data JSON with new asset URLs
        if (!empty($asset_url_map)) {
            error_log("Asset URL Map: " . json_encode($asset_url_map));
            error_log("Original design_data (first 500 chars): " . substr($design_data, 0, 500));
            
            $design_data_json = $design_data;
            $total_replacements = 0;
            foreach ($asset_url_map as $old_url => $new_url) {
                // The design_data JSON has escaped slashes (\\/), so we need to escape for matching
                $old_url_escaped = str_replace('/', '\\/', $old_url);
                $new_url_escaped = str_replace('/', '\\/', $new_url);
                
                $count_before = substr_count($design_data_json, $old_url_escaped);
                $design_data_json = str_replace($old_url_escaped, $new_url_escaped, $design_data_json);
                $count_after = substr_count($design_data_json, $new_url_escaped);
                $replacements = $count_after - substr_count($design_data, $new_url_escaped);
                $total_replacements += $replacements;
                error_log("Searching for: '$old_url_escaped' (found $count_before times)");
                error_log("Replacing with: '$new_url_escaped' (replaced $replacements)");
            }
            
            error_log("Modified design_data (first 500 chars): " . substr($design_data_json, 0, 500));
            
            // Update the design_data in database
            $update_data_stmt = $conn->prepare("UPDATE custom_designs SET design_data = ? WHERE id = ?");
            $update_data_stmt->bind_param("si", $design_data_json, $saved_design_id);
            
            if (!$update_data_stmt->execute()) {
                error_log("Failed to update design_data: " . $update_data_stmt->error);
            } else {
                error_log("Updated design_data with new asset URLs - made $total_replacements replacements");
            }
            
            $update_data_stmt->close();
        }
    } else {
        error_log("No asset_ids to process or not an array");
    }
    
    $conn->commit();
    
    // Fetch the saved design
    $fetch_stmt = $conn->prepare("
        SELECT id, design_name, preview_url, garment_type, garment_color,
               garment_size, technique, print_type, embroidery_type,
               design_data, created_at, updated_at
        FROM custom_designs
        WHERE id = ?
    ");
    $fetch_stmt->bind_param("i", $saved_design_id);
    $fetch_stmt->execute();
    $result = $fetch_stmt->get_result();
    $saved_design = $result->fetch_assoc();
    $fetch_stmt->close();
    
    // Decode design_data JSON
    $saved_design['design_data'] = json_decode($saved_design['design_data'], true);
    
    send_success($design_id ? 'Design updated successfully' : 'Design saved successfully', $saved_design);
    
} catch (Exception $e) {
    $conn->rollback();
    
    // Clean up preview file if it was created
    if (isset($preview_path) && file_exists($preview_path)) {
        unlink($preview_path);
    }
    
    error_log("Save design error: " . $e->getMessage());
    send_error($e->getMessage(), 500);
}
?>
