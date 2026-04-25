<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Get JSON input
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

$to_admin = "balijapandream@gmail.com";
$to_student = $data['email'] ?? '';
$full_name = $data['fullName'] ?? 'Applicant';
$course = ($data['programType'] ?? '') === 'tokutei_ginou' ? 'Tokutei Ginou (6 Months)' : 'Job Matching Only';

$subject = "【BJD】New Application - " . $full_name;
$from = "system@balijapandream.com";

// Admin Email Content
$admin_message = "A new student application has been submitted.\n\n";
$admin_message .= "--- Details ---\n";
$admin_message .= "Name: " . $full_name . "\n";
$admin_message .= "Course: " . $course . "\n";
$admin_message .= "WhatsApp: " . ($data['whatsapp'] ?? '-') . "\n";
$admin_message .= "Email: " . ($data['email'] ?? '-') . "\n\n";
$admin_message .= "Admin Panel: https://balijapandream.com/admin/siswa/applicants\n";

$headers = "From: $from\r\n";
$headers .= "Reply-To: $from\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Send to Admin
$success_admin = mail($to_admin, $subject, $admin_message, $headers);

// Student Auto-Reply Content
$success_student = false;
if (!empty($to_student)) {
    $student_subject = "【Bali Japan Dream】Application Received";
    $student_message = "Hello " . $full_name . ",\n\n";
    $student_message .= "Thank you for applying to Bali Japan Dream.\n";
    $student_message .= "We have successfully received your application for the " . $course . " course.\n\n";
    $student_message .= "Our staff will contact you via WhatsApp shortly to guide you through the next steps.\n\n";
    $student_message .= "Regards,\n";
    $student_message .= "Bali Japan Dream Team";
    
    $success_student = mail($to_student, $student_subject, $student_message, $headers);
}

echo json_encode([
    "status" => "success",
    "admin_notified" => $success_admin,
    "student_notified" => $success_student
]);
