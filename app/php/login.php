<?php
session_start(); // Start the session
require_once 'connect.php'; // Include the connect.php file

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Get the submitted username and password
  $username = $_POST['username'];
  $password = $_POST['password'];

  // Prepare a SQL statement to check if the record exists
  $sql = "SELECT * FROM my_users WHERE username = '$username' AND password = '$password'";
  $result = $conn->query($sql);

  if ($result->num_rows > 0) {
    // The record exists, store the username in a session variable
    $_SESSION['username'] = $username;

    // Redirect to index.html
    header("Location: ../../payment-system.php");
    exit();
  } else {
    echo "Invalid username or password";
  }
}
?>
