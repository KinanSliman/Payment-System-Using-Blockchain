import Block from "./block.js";
import pkg from "crypto-js";
const { SHA256 } = pkg; // Extract the SHA256 function
import fs from "fs/promises"; // Use fs.promises for async file operations
import Transaction from "./transaction.js";

export default class Blockchain {
  constructor(node, index, gossip, premiumWalletPublicKey) {
    this.chain = [];
    this.loadCryptocurrencyConfig(); // Load cryptocurrency configuration
    // Store the libp2p node in the blockchain instance
    // Check if node is defined before using it
    if (typeof node !== "undefined") {
      this.node = node;
      this.index = index;
      this.gossip = gossip(node);
      this.premiumWalletPublicKey = premiumWalletPublicKey;
      //console.log("constructor node is defined", node);
    } else {
      console.error("Node is not defined");
      // You can handle this error in a way that makes sense for your application
    }
  }

  // Load cryptocurrency configuration from cryptocurrency.json
  async loadCryptocurrencyConfig() {
    try {
      const configData = await fs.readFile("cryptocurrency.json", "utf-8");
      this.cryptocurrencyConfig = JSON.parse(configData);
    } catch (error) {
      console.error("Error loading cryptocurrency configuration:", error);
      process.exit(1); // Terminate the process if configuration cannot be loaded
    }
  }

  createGenesisBlock(premiumWallet) {
    // Ensure that premiumWallet is defined
    if (premiumWallet) {
      // Use the premium wallet's publicKey
      const premiumWalletPublicKey = premiumWallet.publicKey;

      // Define the properties of the genesis block
      const timestamp = Date.parse("2023-12-31");
      const transactions = [
        // Create a premium wallet in the genesis block
        {
          fromAddress: "Genesis",
          toAddress: premiumWalletPublicKey, // Use the premium wallet's publicKey
          amount: 1000000, // Example: Initial balance for the premium wallet
          timestamp: Date.parse("2023-12-31"),
          nonce: 777777777,
        },
      ];
      const nonce = 0;
      const previousHash = "0".repeat(64); // Set the previousHash to a string of zeros for the genesis block
      const block = new Block(timestamp, transactions, previousHash, nonce);
      this.chain.push(block);
      // Console log the genesis block data
      console.log("Genesis Block Created:");
      console.log("Timestamp:", block.timestamp);
      console.log("Transactions:", block.transactions);
      console.log("Nonce:", block.nonce);
      console.log("Previous Hash:", block.previousHash);
      console.log("Hash:", block.hash);
    } else {
      console.error("Premium Wallet is not defined");
    }
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  calculateHash(timestamp, transactions, previousHash, nonce) {
    return SHA256(
      previousHash + timestamp + JSON.stringify(transactions) + nonce
    ).toString();
  }

  isValidBlock(newBlock) {
    const { timestamp, transactions, previousHash, nonce } = newBlock;
    const calculatedHash = this.calculateHash(
      timestamp,
      transactions,
      previousHash,
      nonce
    );
    // console.log("Transactions ARRAY in BLOCK:", newBlock.transactions);

    return newBlock.hash === calculatedHash;
  }

  addBlock(newBlock) {
    if (
      this.isValidBlock(newBlock) &&
      newBlock.previousHash === this.getLatestBlock().hash
    ) {
      this.chain.push(newBlock);

      // Generate a random delay between 1 and 3 seconds
      const randomDelay = Math.random() * 3000 + 1000;

      setTimeout(() => {
        this.broadcastBlock(newBlock);
      }, randomDelay);
    } else {
      console.log("Invalid block. Rejected.");
    }
    //console.log(
    // "the full blockchain Array contain this from addBlock in blockchain class:",
    // this.chain
    //);
  }

  async broadcastBlock(newBlock) {
    // Serialize the newBlock
    const serializedNewBlock = newBlock.serialize();
    const message = serializedNewBlock;
    console.log(
      `Node ${this.index + 1} :`,
      "SENT :serializedNewBlock",
      serializedNewBlock
    );
    try {
      await this.node.services.pubsub.publish(
        "newBlockTopic",
        new TextEncoder().encode(message)
      );
    } catch (error) {
      // Handle the network error
      console.log("Error broadcasting new block:", error);
    }
  }

  async ReceivedBlockFromGossipNodes(deSerializedNewBlock) {
    const newBlock = Block.deserialize(deSerializedNewBlock);
    console.log(`Node ${this.index + 1} :`, "received newBlock is: ", newBlock);
    const isValid = this.isValidBlock(newBlock);
    // Deserialize each transaction in the newBlock.transactions array
    const deSerializedTransactionsNEWBlock = newBlock.transactions.map(
      (transactionData) =>
        Transaction.deserialize(JSON.stringify(transactionData))
    );

    // Deserialize each transaction in the this.getLatestBlock().transactions array
    const deSerializedTransactionsLATESTBLOCK =
      this.getLatestBlock().transactions.map((transactionData) =>
        Transaction.deserialize(JSON.stringify(transactionData))
      );

    const premiumWalletPublicKey = this.premiumWalletPublicKey;
    // Function to compare premium transactions
    const comparePremiumTransactions = (transaction1, transaction2) => {
      // Compare relevant fields excluding timestamp
      return (
        transaction1.fromAddress === transaction2.fromAddress &&
        transaction1.toAddress === transaction2.toAddress &&
        transaction1.amount === transaction2.amount
      );
    };

    // Identify and compare premium transactions
    const premiumTransactionsNEWBlock = deSerializedTransactionsNEWBlock.filter(
      (transaction) => transaction.fromAddress === premiumWalletPublicKey
    );

    const premiumTransactionsLATESTBLOCK =
      deSerializedTransactionsLATESTBLOCK.filter(
        (transaction) => transaction.fromAddress === premiumWalletPublicKey
      );

    // Compare premium transactions
    const arePremiumTransactionsEqual = premiumTransactionsNEWBlock.every(
      (transactionNEWBlock) =>
        premiumTransactionsLATESTBLOCK.some((transactionLATESTBLOCK) => {
          const isEqual = comparePremiumTransactions(
            transactionNEWBlock,
            transactionLATESTBLOCK
          );

          return isEqual;
        })
    );

    // Function to compare non premium transactions
    const compareNonPremiumTransactions = (transaction1, transaction2) => {
      // Compare relevant fields excluding timestamp
      return (
        transaction1.fromAddress === transaction2.fromAddress &&
        transaction1.toAddress === transaction2.toAddress &&
        transaction1.amount === transaction2.amount &&
        transaction1.signature === transaction2.signature &&
        transaction1.timestamp === transaction2.timestamp &&
        transaction1.nonce === transaction2.nonce
      );
    };

    // Identify and compare premium transactions
    const nonPremiumTransactionsNEWBlock =
      deSerializedTransactionsNEWBlock.filter(
        (transaction) => transaction.fromAddress !== premiumWalletPublicKey
      );

    const nonPremiumTransactionsLATESTBLOCK =
      deSerializedTransactionsLATESTBLOCK.filter(
        (transaction) => transaction.fromAddress !== premiumWalletPublicKey
      );

    // Compare premium transactions
    const areNonPremiumTransactionsEqual = nonPremiumTransactionsNEWBlock.every(
      (transactionNEWBlock) =>
        nonPremiumTransactionsLATESTBLOCK.some((transactionLATESTBLOCK) => {
          const isEqual = compareNonPremiumTransactions(
            transactionNEWBlock,
            transactionLATESTBLOCK
          );

          return isEqual;
        })
    );

    if (isValid) {
      //if (newBlock.previousHash === this.getLatestBlock().hash) {
      // this.chain.push(newBlock);
      // console.log("first condition is achieved!");
      // } else {
      // console.log("first condition not achieved!");
      //  }
      if (
        areNonPremiumTransactionsEqual &&
        arePremiumTransactionsEqual &&
        newBlock.timestamp < this.getLatestBlock().timestamp
      ) {
        console.log(
          `Node ${this.index + 1} :`,
          "Received Block is valid and will be added permanently to the blockchain:"
        );
        this.chain.pop();
        this.chain.push(newBlock);
      } else {
        console.log(
          `Node ${this.index + 1} :`,
          "received Block is not valid and will not be added to the blockchain"
        );
      }
    }
    console.log(`Node ${this.index + 1} :`, "final blockchain:", this.chain);
  }

  getBalanceForAddress(address) {
    // console.log("accessed: getBalanceForAddress", address);
    let balance = 0;
    let addressFound = false; // Add a flag to track if the address is found

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.fromAddress === address) {
          balance -= transaction.amount;
          addressFound = true; // Address found when it's a sender
        }

        if (transaction.toAddress === address) {
          balance += transaction.amount;
          addressFound = true; // Address found when it's a receiver
        }
      }
    }

    // Check if the address was found, and return "not available" if it wasn't
    if (!addressFound) {
      return "Account not active yet";
    }

    return balance;
  }

  getAllBlocks() {
    return this.chain;
  }
}
