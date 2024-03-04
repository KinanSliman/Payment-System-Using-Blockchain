<?php
require 'connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response = ['error' => 'Method Not Allowed'];
    echo json_encode($response);
    exit;
}

$data = json_decode(file_get_contents('php://input'));
$publicKey = trim($data->publicKey);

header('Content-Type: application/json');

$query = "SELECT publicKey FROM my_users WHERE publicKey = ?";
$stmt = $conn->prepare($query);

if (!$stmt) {
    $response = ['error' => 'Database error: ' . $conn->error];
    echo json_encode($response);
    exit;
}

$stmt->bind_param("s", $publicKey);
$stmt->execute();

if ($stmt->error) {
    $response = ['error' => 'Query error: ' . $stmt->error];
    echo json_encode($response);
    exit;
}

$stmt->store_result();

if ($stmt->num_rows > 0) {
    // publicKey exists in the database
    echo json_encode("yes");
} else {
    // publicKey does not exist in the database
    echo json_encode("no");
}
?>
