const Transaction = require("./transaction");
const { MAX_TRANSACTIONS_PER_BLOCK } = require("./blockConfig");

class Pool {
  constructor() {
    this.transactions = [];
    this.maxTransactionsPerBlock = MAX_TRANSACTIONS_PER_BLOCK; // Use the value from blockConfig.js
  }

  addTransaction(transaction) {
    //  console.log("reaching the addTransaction function in pool.js");
    if (!transaction.isValid()) {
      throw new Error("Invalid transaction. Cannot add to pool.");
    } else if (this.transactions.length >= this.maxTransactionsPerBlock) {
      throw new Error(
        "Transaction pool is full. Cannot add more transactions."
      );
    } else if (this.isNonceInPool(transaction.nonce)) {
      throw new Error(
        "Transaction with the same nonce already exists in the pool."
      );
    } else {
      this.transactions.push(transaction);
    }
  }

  isNonceInPool(nonce) {
    return this.transactions.some((transaction) => transaction.nonce === nonce);
  }

  clear() {
    this.transactions = [];
  }

  getTransactions() {
    return this.transactions;
  }

  serialize() {
    return JSON.stringify(
      this.transactions.map((transaction) => transaction.serialize())
    );
  }

  static deserialize(json) {
    const data = JSON.parse(json);
    const transactions = data.map((transactionData) =>
      Transaction.deserialize(transactionData)
    );
    const pool = new Pool();
    pool.transactions = transactions;
    return pool;
  }
}

module.exports = Pool;

const pool = new Pool();
