//import Blockchain from "./blockchain.mjs";
const Pool = require("./pool.js");
const Block = require("./block.js");
const Transaction = require("./transaction.js");
const crypto = require("crypto");

class ProofOfWork {
  constructor(pool, blockchain) {
    this.difficulty = 2;
    this.blockchain = blockchain;
    this.pool = pool;
  }

  execute() {
    console.log("starting Proof of work consenssus");
    const transactions = this.pool.getTransactions();
    //console.log("local pools valid transactions are:", transactions);
    const newBlock = this.mineBlock(transactions);
    this.blockchain.addBlock(newBlock);
    this.pool.clear();
  }

  mineBlock(transactions) {
    // console.log("MINEBLOCK transactions are:", transactions);

    //let nonce = 0;
    let nonce = Math.floor(Math.random() * Math.pow(2, 32)); // Random 32-bit nonce
    let hash;

    // Check if there are blocks in the blockchain
    if (this.blockchain.chain.length > 0) {
      hash = this.calculateHash(nonce, transactions);
      while (!this.isBlockValid(hash)) {
        //nonce++;
        nonce = (nonce + 1) % Math.pow(2, 32); // Increment and wrap around at 2^32
        hash = this.calculateHash(nonce, transactions);
      }
    }
    //console.log("Block mined:", hash);
    //console.log("Block mined transactions:", transactions);
    try {
      // console.log("Latest block hash:", this.blockchain.getLatestBlock().hash);
    } catch (error) {
      console.error("Error while accessing the latest block hash:", error);
    }

    return new Block(
      Date.now(),
      transactions,
      this.blockchain.getLatestBlock().hash,
      nonce
    );
  }

  calculateHash(nonce, transactions) {
    const data = nonce.toString() + JSON.stringify(transactions); // Convert the nonce and transactions to a standardized format
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    //Calculate the hash using the SHA-256 algorithm
    //console.log("Calculate the hash using the SHA-256 algorithm");
    console.log("POW calculated block hash", hash, " Nonce: ", nonce);
    return hash;
  }

  isBlockValid(hash) {
    // Check if the hash meets the difficulty level requirements
    const prefix = "0".repeat(this.difficulty);
    return hash.startsWith(prefix);
  }
}

module.exports = ProofOfWork;
