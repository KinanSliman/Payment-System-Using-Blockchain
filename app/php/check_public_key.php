<?php
require 'connect.php';
// Add this line to log the request method
error_log($_SERVER['REQUEST_METHOD']);

// If the request method is not POST, return a 405 error
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response = ['error' => 'Method Not Allowed'];
    echo json_encode($response);
    exit; // Make sure to exit the script
}

// Get the user-entered public key and session username from the request
$data = json_decode(file_get_contents('php://input'));
// Retrieve the username from JSON data
$username = trim($data->sessionUsername);

// Include the database connection code from connect.php


// Set the Content-Type header to application/json
header('Content-Type: application/json');

// Query the database to retrieve the stored public key for the user
$query = "SELECT publicKey FROM my_users WHERE username = ?";
$stmt = $conn->prepare($query);

if (!$stmt) {
    $response = ['error' => 'Database error: ' . $conn->error];
    echo json_encode($response);
    exit;
}

$stmt->bind_param("s", $username); // Bind the username from JSON data
$stmt->execute();

if ($stmt->error) {
    $response = ['error' => 'Query error: ' . $stmt->error];
    echo json_encode($response);
    exit;
}

$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->bind_result($storedPublicKey);
    $stmt->fetch();

    // Echo the storedPublicKey directly as JSON
    echo json_encode($storedPublicKey);
} else {
    // If no data found, return an appropriate response
    $response = ['error' => 'Data not found'];
    echo json_encode($response);
}
?>

