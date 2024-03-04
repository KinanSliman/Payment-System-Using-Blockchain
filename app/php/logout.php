<?php
session_start();

// Unset the session variable
unset($_SESSION['username']);

// Destroy the session
session_destroy();

// JavaScript to clear local storage items
echo '<script>
        // Function to remove local storage items
        function clearLocalStorage() {
            localStorage.removeItem("userMnemonic");
            localStorage.removeItem("storedPublicKey");
        }

        // Clear local storage items
        clearLocalStorage();

        // Redirect the user to the login page (you can change the URL to your login page)
        window.location.href = "../../index.html";
      </script>';
?>
