<?php
require_once 'connect.php'; // Include the connect.php file

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Get the submitted username and password
  $username = $_POST['username'];
  $password = $_POST['password'];

  // Prepare a SQL statement to insert the new record
  $sql = "INSERT INTO my_users (username, password) VALUES ('$username', '$password')";
  
  if ($conn->query($sql) === TRUE) {
    echo "Registration successful!";
    header("Location: ../../index.html");
  } else {
    echo "Error: " . $sql . "<br>" . $conn->error;
  }
}
?>
