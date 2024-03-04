const SHA256 = require("crypto-js/sha256");
const elliptic = require("elliptic");
const EC = elliptic.ec;

class Transaction {
  constructor(fromAddress, toAddress, amount, nonce) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.nonce = nonce;
    this.timestamp = Date.now();
    this.signature = "";
  }

  calculateHash() {
    return SHA256(
      this.fromAddress +
        this.toAddress +
        this.amount +
        this.nonce +
        this.timestamp
    ).toString();
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("Cannot sign transactions for other wallets.");
    }

    const transactionHash = this.calculateHash();
    const signature = signingKey.sign(transactionHash, "base64");
    //This line signs the transactionHash using
    //the signingKey and produces a signature in base64 format.
    this.signature = signature.toDER("hex");
    //The resulting signature is converted to a DER-encoded
    // hexadecimal string and assigned to the signature
    // property of the current transaction object.
  }

  isValid() {
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction.");
    }

    const ec = new EC("secp256k1");
    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }

  serialize() {
    return JSON.stringify({
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      nonce: this.nonce,
      timestamp: this.timestamp,
      signature: this.signature,
    });
  }

  static deserialize(json) {
    const data = JSON.parse(json);
    const transaction = new Transaction(
      data.fromAddress,
      data.toAddress,
      data.amount,
      data.nonce
    );
    transaction.timestamp = data.timestamp;
    transaction.signature = data.signature;
    return transaction;
  }
}

if (typeof window !== "undefined") {
  window.Transaction = Transaction;
}
module.exports = Transaction;
