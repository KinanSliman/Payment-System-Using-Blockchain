<?php

require_once 'connect.php'; // Include the connect.php file

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log('Received POST request'); // Log the request
    
    // Retrieve values from the POST data
    $username = $_POST['username'];
    $password = $_POST['password'];
    $publicKey = $_POST['publicKey'];
    
    // Use prepared statement to insert data
    $query = "INSERT INTO my_users (username, password, publicKey) VALUES (?, ?, ?)";
    
    // Prepare the SQL statement
    $stmt = $conn->prepare($query);
    
    // Bind parameters
    $stmt->bind_param("sss", $username, $password, $publicKey);
    
    // Execute the statement
    if ($stmt->execute()) {
        echo 'Data inserted successfully.';
    } else {
        echo 'Error inserting data: ' . $stmt->error;
    }
    
    // Close the statement and the database connection
    $stmt->close();
    $conn->close();
} else {
    http_response_code(405);
    echo 'Method Not Allowed';
}
?>
