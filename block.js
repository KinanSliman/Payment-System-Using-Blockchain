const SHA256 = require("crypto-js/sha256");
const { MAX_TRANSACTIONS_PER_BLOCK } = require("./blockConfig"); // Import the configuration with the maximum block size
const Transaction = require("./transaction.js");

class Block {
  constructor(timestamp, transactions, previousHash = "", nonce = "") {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = nonce; // Initialize the nonce to 0
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const data =
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce;
    const hash = SHA256(data).toString();
    return hash;
  }

  serialize() {
    return JSON.stringify({
      timestamp: this.timestamp,
      transactions: this.transactions.map((transaction) =>
        transaction.serialize()
      ),
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash,
    });
  }

  static deserialize(json) {
    const data = JSON.parse(json);
    const transactions = data.transactions.map((transactionData) =>
      Transaction.deserialize(transactionData)
    );
    const block = new Block(data.timestamp, transactions, data.previousHash);
    block.nonce = data.nonce;
    block.hash = data.hash;
    return block;
  }
}

module.exports = Block;
