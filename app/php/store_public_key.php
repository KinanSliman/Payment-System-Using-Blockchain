<?php
require_once 'connect.php'; // Include the connect.php file

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log('Received POST request'); // Log the request
  
    $username = $_POST['username'];
    $publicKey = $_POST['publicKey'];
      
        // Update the query to store the public key
        $query = "UPDATE my_users SET publicKey = '$publicKey' WHERE username = '$username'";

        if ($conn->query($query) === TRUE) {
            echo 'Public key stored successfully';
            echo 'Username: ' . $username . '<br>';
            echo 'stored Public Key: ' . $publicKey . '<br>';
        } else {
            echo 'Error storing public key: ' . $conn->error;
        }

    $conn->close();
} else {
    http_response_code(405);
    echo 'Method Not Allowed';
}
?>
