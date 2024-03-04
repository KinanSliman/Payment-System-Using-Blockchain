
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home Page</title>
    <link rel="stylesheet" href="app/scss/style.css">
</head>
<body>
<?php
require './app/php/connect.php';
session_start();

$hideCreateWalletButton = false;
$hideMnemonicContainer = false;
$hideMnemonic = false;

if (isset($_SESSION['username'])) {
    $username = $_SESSION['username'];
    echo "<p>Welcome, " . $username . "!</p>";
    
    $query = "SELECT publicKey FROM my_users WHERE username = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();
    
    $stmt->bind_result($publicKey);
    
    if ($stmt->num_rows > 0) {
        $stmt->fetch(); 
        
        if (!empty($publicKey)) {
            $hideCreateWalletButton = true;
            $hideMnemonicContainer = true;
            $hideMnemonic = true;
        } else {
            $hideCreateWalletButton = false;
            $hideMnemonicContainer = false;
            $hideMnemonic = false;
        }
    } else {
        $hideCreateWalletButton = false;
        $hideMnemonicContainer = false;
        $hideMnemonic = false;
    }

    $stmt->close();
}

?>

    <header class="header">
        <h2>Syrian Digital Cryptocurrency (SDC)</h2>
        <a href="./app/php/logout.php">Logout</a>
    </header>
    <main class="main">
       <button id="createWalletButton" <?php if ($hideCreateWalletButton) echo 'style="display: none;"'; ?>>
             create wallet
        </button> 
       <button type="button" id="connectButton">Connect Wallet</button>
        
        
<p id="mnemonic" style="display: none;" <?php if ($hideMnemonic) echo 'style="display: none;"'; ?>>mnemonic:</p>
<div id="mnemonicContainer" style="display: none;"  <?php if ($hideMnemonicContainer) echo 'style="display: none;"'; ?>></div>
<button id="showMnemonicButton" style="display: none;">Show Mnemonic</button>
<script src="./dist/wallet.js"></script>
<script>
const createWalletButton = document.getElementById("createWalletButton");
const showMnemonicButton = document.getElementById("showMnemonicButton");
const mnemonicElement = document.getElementById("mnemonic");
const mnemonicContainer = document.getElementById("mnemonicContainer");

createWalletButton.addEventListener('click', async () => {
  mnemonicContainer.style.display = "block";
  mnemonicElement.style.display = "block";
  const wallet = new Wallet("<?php echo isset($_SESSION['username']) ? $_SESSION['username'] : ''; ?>");
  await wallet.initialize();

  const mnemonic = wallet.mnemonic;
  console.log("Wallet creation from index.php - mnemonic phrase is:", mnemonic);

  mnemonicElement.textContent = `Note: refresh the page only after storing your mnemonic phrase in a safe place, we can't help you retrieve it if lost. you can write it on a paper or take a picture of it`;

  // Split the mnemonic into an array of words
  const words = mnemonic.split(" ");
  // Update the HTML with the generated mnemonic
  mnemonicContainer.innerHTML = "";
  words.forEach((word, index) => {
    const label = document.createElement("label");
    label.textContent = `Word ${index + 1}`;

    const input = document.createElement("input");
    input.type = "password";
    input.value = word;
    input.disabled = true;

    const div = document.createElement("div");
    div.appendChild(label);
    div.appendChild(input);

    mnemonicContainer.appendChild(div);
  });
  showMnemonicButton.style.display = "block";
});

showMnemonicButton.addEventListener('click', () => {
    const inputElements = mnemonicContainer.querySelectorAll("input");
    inputElements.forEach((input) => {
        input.type = input.type === "password" ? "text" : "password";
    });
});
</script>

<div id="mnemonicFormContainer" style="display: none;">
  <!-- retrieve master seed form:-->
  <form id="mnemonicForm">
  <label for="mnemonicWord1">Word 1:</label>
  <input type="text" id="mnemonicWord1" required>
  <br>
  
  <label for="mnemonicWord2">Word 2:</label>
  <input type="text" id="mnemonicWord2" required>
  <br>
  
  <label for="mnemonicWord3">Word 3:</label>
  <input type="text" id="mnemonicWord3" required>
  <br>
  
  <label for="mnemonicWord4">Word 4:</label>
  <input type="text" id="mnemonicWord4" required>
  <br>
  
  <label for="mnemonicWord5">Word 5:</label>
  <input type="text" id="mnemonicWord5" required>
  <br>
  
  <label for="mnemonicWord6">Word 6:</label>
  <input type="text" id="mnemonicWord6" required>
  <br>
  
  <label for="mnemonicWord7">Word 7:</label>
  <input type="text" id="mnemonicWord7" required>
  <br>
  
  <label for="mnemonicWord8">Word 8:</label>
  <input type="text" id="mnemonicWord8" required>
  <br>
  
  <label for="mnemonicWord9">Word 9:</label>
  <input type="text" id="mnemonicWord9" required>
  <br>
  
  <label for="mnemonicWord10">Word 10:</label>
  <input type="text" id="mnemonicWord10" required>
  <br>
  
  <label for="mnemonicWord11">Word 11:</label>
  <input type="text" id="mnemonicWord11" required>
  <br>
  
  <label for="mnemonicWord12">Word 12:</label>
  <input type="text" id="mnemonicWord12" required>
  <br>
  
  <button type="submit">Connect to your wallet</button>
</form>
</div>
<!-- Add this div element for displaying error messages -->
<div id="errorContainer" style="display: none;"></div>

<script>
  const connectButton = document.getElementById('connectButton');
  const mnemonicFormContainer = document.getElementById('mnemonicFormContainer');
  const mnemonicForm = document.getElementById('mnemonicForm');
  const errorContainer = document.getElementById('errorContainer');



// Add a click event listener to the connectButton
connectButton.addEventListener('click', function () {
  // Toggle the visibility of the mnemonic form
  mnemonicFormContainer.style.display =
    mnemonicFormContainer.style.display === 'none' ? 'block' : 'none';
});


// Handle form submission
mnemonicForm.addEventListener('submit', async function (event) {
  event.preventDefault(); // Prevent form submission

  // Retrieve the values of each input field and concatenate to form the mnemonic
  const mnemonicWords = [];
  for (let i = 1; i <= 12; i++) {
    const inputId = `mnemonicWord${i}`;
    const inputField = document.getElementById(inputId);
    mnemonicWords.push(inputField.value);
  }

  const userMnemonic = mnemonicWords.join(' ');

  try {
    // Generate the public key from the user-entered mnemonic
    const wallet = new Wallet('', userMnemonic); // Pass an empty string as username
    const updatedWallet = await wallet.generateMasterSeedFromMnemonic(userMnemonic);
    console.log('wallet.publicKey from paymentsystem.php is:', updatedWallet.publicKey);
    

    // Send a POST request to the PHP script for verification
    const response = await fetch('./app/php/check_public_key.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionUsername: '<?php echo $_SESSION["username"]; ?>', // Include the session username
      }),
    });

    console.log('HTTP Status Code:', response.status); // Log the HTTP status code

    if (response.status === 200) {
      const textResponse = await response.text();
      console.log('textResponse', textResponse);

      // Check if textResponse is empty
      if (textResponse.trim() === '') {
        showError('Empty response received.');
        console.log('Empty response received.');
      } else {
        console.log('non-Empty response received.');
        try {
          const storedPublicKey = JSON.parse(textResponse); // Parse the JSON string
          if (updatedWallet.publicKey === storedPublicKey) {
            localStorage.setItem('userMnemonic', userMnemonic);
            localStorage.setItem('storedPublicKey', JSON.stringify(storedPublicKey));
            console.log('storedPublicKey  stored in local storage:', storedPublicKey);

            alert('right mnemonic entered');
             // Now show the wallet section
              mnemonicFormContainer.style.display = 'none'; // Hide the mnemonic form
              walletSection.style.display = 'block'; // Show the wallet section
              connectButton.style.display = 'none';
              setTimeout(function() {
              location.reload();
              }, 1000);

            // Now you can use the private key buffer to sign transactions or perform other operations
          } else {
            // Mnemonic does not match, display an error message to the user
            showError('Wrong mnemonic entered. Please enter it again.');
          }
        } catch (jsonError) {
          console.error('JSON Parsing Error:', jsonError);
          console.log('Response content:', textResponse); // Log the response content
          showError('An error occurred while parsing the response.');
        }
      }
    } else {
      console.error('HTTP Error:', response.status);
      showError('An error occurred. Please try again later.');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('ERROR An error occurred. Please try again later.');
  }
}); 

// Function to display an error message
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
}

</script>



<div class="wallet" id="walletSection" style="display: none;">
        <div class="wallet__header">
          <h4>My Wallet</h4>
        <div class="addressInfo">
        <p id="addressParagraph">my address: This is a public key</p>
          <img id="copyButton" src="./images/copy.png" alt="Copy Public Key" style="cursor: pointer;">

        </div>
         
<script>
// Get the value from localStorage
 storedPublicKey = localStorage.getItem('storedPublicKey');

// Check if the value is not null or undefined
if (storedPublicKey !== null && storedPublicKey !== undefined) {
  // Remove the double quotation marks (") from the beginning and end of the string
  storedPublicKey = storedPublicKey.replace(/^"|"$/g, '');

  // Shorten the public key to display the first four characters, ellipsis, and the last four characters
  var shortenedPublicKey = storedPublicKey.slice(0, 4) + '...' + storedPublicKey.slice(-4);

  // Update the content of the <p> element
  var addressParagraph = document.getElementById('addressParagraph');
  addressParagraph.textContent = 'my address: ' + shortenedPublicKey;

  // Add a click event handler to the image
  var copyButton = document.getElementById('copyButton');
  copyButton.onclick = function () {
    // Create a temporary input element to copy the public key
    var tempInput = document.createElement('input');
    tempInput.setAttribute('value', storedPublicKey);
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert('Public key copied to clipboard: ' + storedPublicKey);
  };
}
</script>

        </div>
        <div class="wallet__body">
        <h2 id="balance-tag">Balance in SDC:</h2>

        <script>
  let balance = "";
  let socketBalance; // Declare the socket variable outside the function

  document.addEventListener("DOMContentLoaded", function () {
    // Check if the 'storedPublicKey' item exists in localStorage
    if (localStorage.getItem('storedPublicKey')) {
      // If it exists, show the mnemonicFormContainer
      walletSection.style.display = 'block';
    }

    let storedPublicKey;

    if (localStorage.getItem('storedPublicKey') !== null) {
      storedPublicKey = JSON.parse(localStorage.getItem('storedPublicKey'));

      if (isValidAddress(storedPublicKey)) {
        // Function to validate the address (you can customize this function)

        function connectWebSocket() {
          // Close the existing WebSocket connection if it exists
          if (socketBalance) {
            socketBalance.close();
          }
          // If storedPublicKey is a valid address, proceed with WebSocket connection
          socketBalance = new WebSocket('ws://localhost:9003'); // Replace with your server's WebSocket address
          // Handle WebSocket open event
          socketBalance.addEventListener('open', (event) => {
            // Send a request to get the balance for the stored public key
            socketBalance.send(JSON.stringify({ command: 'getBalance', address: storedPublicKey }));
          });

          socketBalance.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            //console.log('received socketer:', message);

            if (message.type === "getBalanceResponse") {
              // Parse the message.message property as it is a JSON string
              const parsedMessage = JSON.parse(message.message);

              // Check if the received address matches the stored address
              if (parsedMessage.address === storedPublicKey) {
                // Update the HTML tag with the balance
                const balanceTag = document.getElementById('balance-tag');
                balanceTag.textContent = `Balance is: ${parsedMessage.balance}`+" "+ "(SDC)";
                try {
                  balance = parsedMessage.balance;
                } catch (error) {
                  console.log('sorry I could not update balance tag');
                }

              }
            }
          });
        }
        // Call the WebSocket function initially
        connectWebSocket();

        // Set up an interval to update the balance every 5 seconds
        setInterval(connectWebSocket, 5000); // Reduced the interval to 5 seconds
      } else {
        console.log('Invalid storedPublicKey:', storedPublicKey);
      }
    } else {
      console.log('storedPublicKey is null or undefined');
    }
  });

  function isValidAddress(address) {
    // Implement your address validation logic here
    // Return true if it's a valid address, false otherwise
    return true; // Replace with your validation logic
  }
</script>


          
          <div class="wallet__body__operations">

            <div id="BuyButton" class="wallet__body__operations__operation">
    <img src="./images/buy.png" alt="buy crypto image">
    <p>Buy</p>
</div>

<form id="buyForm" style="display: none;">
    <label for="amount">Amount</label>
    <input type="number" id="buyAmount" name="buyAmount" step="0.01">
    <input type="hidden" id="userAddress" name="userAddress" value="Initial Address">
    <button type="submit">Buy</button>
</form>

    <script>
     
// Get the value from localStorage
 storedPublicKey = localStorage.getItem('storedPublicKey');

// Check if the value is not null or undefined
if (storedPublicKey !== null && storedPublicKey !== undefined) {
  // Remove the double quotation marks (") from the beginning and end of the string
  storedPublicKey = storedPublicKey.replace(/^"|"$/g, '');
  
  // Set the value of the input field
  document.getElementById('userAddress').value = storedPublicKey;
}

  //for handling buying crypto process:
  
    const BuyButton = document.getElementById('BuyButton');
    const buyForm = document.getElementById('buyForm');
   

  // Add a click event listener to the "Send" button div
  BuyButton.addEventListener('click', function() {
    // Toggle the visibility of the form when the button is clicked
    if (buyForm.style.display === 'none' || buyForm.style.display === '') {
      buyForm.style.display = 'block';
    } else {
      buyForm.style.display = 'none';
    }
   
  });
  const buySocket = new WebSocket("ws://localhost:9003");

// Add an event listener to check if the WebSocket connection is open
buySocket.addEventListener('open', (event) => {
    // WebSocket is open, you can now send data

    // Your form submission code or any other WebSocket-related code
    buyForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const buyAmount = parseFloat(document.getElementById('buyAmount').value);
        const userAddress = document.getElementById('userAddress').value;

        // Create a message to send
        const message = JSON.stringify({ command: 'getCrypto', data: { userAddress, buyAmount } });

        // Check if the WebSocket is open before sending
        if (buySocket.readyState === WebSocket.OPEN) {
          buySocket.send(message);
            console.log('Data sent successfully');
        } else {
            console.error('WebSocket connection is not open');
            // You can handle this situation as needed (e.g., show an error message to the user)
        }
        setTimeout(function() {
              location.reload();
              }, 5000);
    });
});

buySocket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});


</script>


 
            <div id="mySendButton" class="wallet__body__operations__operation">
              <img src="./images/send.png" alt="send crypto image">
              <p>Send</p>
            </div>
          </div>
      
          <h1>Transaction Form</h1>
          <div class="SendForm">
          <form id="transactionForm"  style="display: none;">
<label for="showAddress">from Address:</label>
  <input type="text" id="showAddress" name="showAddress" readonly>
  
  <script>
// Get the value from localStorage
 storedPublicKey = localStorage.getItem('storedPublicKey');

// Check if the value is not null or undefined
if (storedPublicKey !== null && storedPublicKey !== undefined) {
  // Remove the double quotation marks (") from the beginning and end of the string
  storedPublicKey = storedPublicKey.replace(/^"|"$/g, '');
  
  // Set the value of the input field
  document.getElementById('showAddress').value = storedPublicKey;
}
</script>
<br><br>
<input type="hidden" id="fromAddress" name="fromAddress" value="">
<script>
  // Copy the value of the readonly input to the hidden input before submitting the form
  document.getElementById('transactionForm').addEventListener('submit', function(event) {
    const readonlyValue = document.getElementById('showAddress').value;
    document.getElementById('fromAddress').value = readonlyValue;
  });
</script>
  <label for="toAddress">To Address:</label>
  <input type="text" id="toAddress" name="toAddress" required><br><br>

  <label for="amount">Amount:</label>
  <input type="number" id="amount" name="amount" required><br><br>
  <input type="hidden" id="nonce" name="nonce" value="">
  
  <button type="submit">Submit</button>
</form>
<div id="errorMessages"></div>
</div>
        </div>
      </div>
      <!-- 
      <h2>Transaction Log</h2>
      <div id="transactionLog"></div>
      -->

<script>
  // Get a reference to the "Send" button div and the 
  const sendButton = document.getElementById('mySendButton');
  const transactionForm = document.getElementById('transactionForm');

  // Check if the 'storedPublicKey' item exists in localStorage
if (localStorage.getItem('storedPublicKey')) {
  // If it exists, show the mnemonicFormContainer
  transactionForm.style.display = 'block';
}
  // Add a click event listener to the "Send" button div
  mySendButton.addEventListener('click', function() {
    // Toggle the visibility of the form when the button is clicked
    if (transactionForm.style.display === 'none' || transactionForm.style.display === '') {
      transactionForm.style.display = 'block';
    } else {
      transactionForm.style.display = 'none';
    }
  });
</script>


<script src="./dist/transaction.js"></script>

<script>
    // Function to generate a random nonce
    function generateNonce() {
    return Math.floor(Math.random() * Math.pow(2, 32));
  }

   // Get the WebSocket connection to bridgeNode
   function viewBalance(){
    console.log('balance is:',balance);
   }
  
   setInterval(viewBalance, 2000); // Reduced the interval to 5 seconds
  
   const ws = new WebSocket("ws://localhost:9003");
   
     // The function to handle the transaction form submission
     document.getElementById("transactionForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        
        // Get form input values
        const fromAddress = document.getElementById("fromAddress").value;
        const toAddress = document.getElementById("toAddress").value;
        const amount = parseFloat(document.getElementById("amount").value);
         // Generate a random nonce
        const nonceValue =await generateNonce();
        document.getElementById('nonce').value = nonceValue;
         // Now you can use 'nonceValue' in your code
        console.log('Nonce is:', nonceValue);
        console.log('fromAddress form submittion in transaction form is:',fromAddress);
       

        if(typeof balance=="number"){

if (fromAddress === toAddress){
  showError('you can not make transactions to your self');
      document.getElementById("transactionForm").reset();
      setTimeout(function() {
              location.reload();
              }, 5000);
}else{
        if (amount <= balance) {
try {
  const response = await fetch('./app/php/receipentAddressAuth.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publicKey: toAddress,
    }),
  });
  console.log('HTTP Status Code:', response.status);

  if (response.status === 200) {
    const textResponse = await response.text();
    const Response = JSON.parse(textResponse);
    console.log('textResponse', textResponse);
    
    if (Response.trim() === 'yes')  {
       // Create a new transaction
       const nonce= nonceValue;
      console.log('nonce before making transaction: ',nonce)
      const transaction = new Transaction(fromAddress, toAddress, amount, nonce);
      console.log('user transaction:',transaction);
      const privateKeyBuffer = await retrievePrivateKeyBuffer();
     
      // Sign the transaction with the retrieved private key
      await window.walletInstance.signTransaction(transaction,privateKeyBuffer);
 
  const message = JSON.stringify({ command: 'getTransaction', data: transaction.serialize() });
  console.log('user transaction sent to web socket is : ', message);
  ws.send(message);
      async function retrievePrivateKeyBuffer() {
        // Retrieve the mnemonic words from the mnemonic form
        const userMnemonic = localStorage.getItem('userMnemonic');
        // Generate the master seed and retrieve the private key buffer
        const { privateKeyBuffer } = await window.walletInstance.generateMasterSeedFromMnemonic(userMnemonic);
        return privateKeyBuffer;
      }
      
      showError('Broadcasting transaction to the network');
      document.getElementById("transactionForm").reset();
      setTimeout(function() {
              location.reload();
              }, 5000);
      
    }else if (Response.trim() === 'no') {
      // Address does not exist in the database
      console.log('Address does not exist');
      showError('Recipient address not found');
      document.getElementById("transactionForm").reset();
      setTimeout(function() {
              location.reload();
              }, 5000);
    } 
  } else {
    console.error('HTTP Error:', response.status);
    showError('An error occurred. Please try again later.');
  }
} catch (error) {
  console.error('Error:', error);
  showError('An error occurred. Please try again later.');
}

        }
        else {
    // Show an error message if the amount exceeds the balance
    showError('Insufficient balance!');
  }
   }
}else if(balance==="Account not active yet"){
  showError('your account is not activated, please charge cryptocurrnency before making any transaction');
  setTimeout(function() {
              location.reload();
              }, 5000);
}
function showError(message) {
  const errorMessages = document.getElementById("errorMessages");
  errorMessages.innerHTML = message;
}

});

</script>



<!--viewing blockchain information -->

<div id="blockchain-info">
  <h2>Shared Ledger:</h2>
  <table id="blockchain-table">
    <tbody id="blockchain-table-body"></tbody>
  </table>
</div>
<script>
  // Function to format transaction addresses
  function formatTransactionAddresses(transactions) {
    const formattedTransactions = transactions.map((transaction) => {
      const fromAddress = `${transaction.fromAddress}`;
      //const toAddress = `${transaction.toAddress.substring(0, 6)}...${transaction.toAddress.slice(-6)}`;
      const toAddress = `${transaction.toAddress}`;
      const amount = `${transaction.amount}`;
      const timestamp = `${transaction.timestamp}`;
      const nonce = `${transaction.nonce}`;
      const signature = `${transaction.signature}`;
      return `"fromAddress": "${fromAddress}", "toAddress": "${toAddress}", "amount": "${amount}","timestamp": "${timestamp}","nonce": "${nonce}","signature": "${signature}"`;
    });
    return formattedTransactions.join("<br><br>");
  }

  // Function to update the HTML table with blockchain data

  function updateBlockchainInfo(blocks) {
  const tableBody = document.getElementById("blockchain-table-body");

  // Clear the table body before populating it with new data
  tableBody.innerHTML = "";

  // Loop through the blocks and create rows in the table
  //console.log('type of block is:', typeof blocks);
  if(typeof blocks=="object"){

  blocks.forEach((block, index) => {
    // Create a single row for each block
    const row = document.createElement("tr");

    // Add cells for Block Number
    const blockNumberHeadingCell = document.createElement("th");
    const blockNumberDataCell = document.createElement("td");
    blockNumberHeadingCell.textContent = "Block Number";
    blockNumberDataCell.textContent = index;
    row.appendChild(blockNumberHeadingCell);
    row.appendChild(blockNumberDataCell);

    // Add cells for Timestamp
    const timestampHeadingCell = document.createElement("th");
    const timestampDataCell = document.createElement("td");
    timestampHeadingCell.textContent = "Timestamp";
    timestampDataCell.textContent = block.timestamp;
    row.appendChild(timestampHeadingCell);
    row.appendChild(timestampDataCell);

    // Add cells for Transactions
    const transactionsHeadingCell = document.createElement("th");
    const transactionsDataCell = document.createElement("td");
    transactionsHeadingCell.textContent = "Transactions";
    transactionsDataCell.innerHTML = formatTransactionAddresses(block.transactions);
    row.appendChild(transactionsHeadingCell);
    row.appendChild(transactionsDataCell);

     // Add cells for Nonce
     const nonceHeadingCell = document.createElement("th");
    const nonceDataCell = document.createElement("td");
    nonceHeadingCell.textContent = "Nonce";
    nonceDataCell.innerHTML = block.nonce;
    row.appendChild(nonceHeadingCell);
    row.appendChild(nonceDataCell);

    // Add cells for Previous Hash
    const previousHashHeadingCell = document.createElement("th");
    const previousHashDataCell = document.createElement("td");
    previousHashHeadingCell.textContent = "Previous Hash";
    previousHashDataCell.textContent = block.previousHash;
    row.appendChild(previousHashHeadingCell);
    row.appendChild(previousHashDataCell);

    // Add cells for Hash
    const hashHeadingCell = document.createElement("th");
    const hashDataCell = document.createElement("td");
    hashHeadingCell.textContent = "Hash";
    hashDataCell.textContent = block.hash;
    row.appendChild(hashHeadingCell);
    row.appendChild(hashDataCell);

    // Append the row to the table body
    tableBody.appendChild(row);
  });
}
}

  // Create a WebSocket connection to the server
  const socket = new WebSocket("ws://localhost:9003"); // Adjust the server URL as needed

  // Send a message to request blockchain information when the connection is open
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ command: "getBlocks" }));
  });

  // Handle messages received from the server
  socket.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);

    // Check if the received data contains blockchain information
    if (data.blocks) {
      const blocks = data.blocks;
      // Update the DOM with the received blockchain data
      updateBlockchainInfo(blocks);
    }

    // Add more handling for other messages as needed
  });
</script>

    </main>
    <script>
let hasReloaded = localStorage.getItem('hasReloaded');

if (!hasReloaded) {
  // Schedule the reload after 10 seconds
  let reloadTimeout = setTimeout(function() {
    // Reload the page
    location.reload();

    // Set the flag in local storage to indicate that the reload has been scheduled
    localStorage.setItem('hasReloaded', true);
  }, 3000);
}
  </script>

</main>

</body>
</html>