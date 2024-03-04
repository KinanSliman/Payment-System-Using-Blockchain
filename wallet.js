const bip39 = require("bip39");
const crypto = require("crypto");
const elliptic = require("elliptic");
const EC = elliptic.ec;
const { Buffer } = require("buffer");
const axios = require("axios");
global.Buffer = Buffer;

class Wallet {
  constructor(username, userMnemonic) {
    this.username = username;
    this.ec = new EC("secp256k1");
    this.keyPair = null;
    this.publicKey = null;
    this.privateKey = null;
    this.mnemonic = userMnemonic || null;
  }

  async initialize() {
    try {
      if (!this.mnemonic) {
        this.mnemonic = await this.generateMnemonic();
        console.log("Mnemonic seed on retrieveMasterSeed:", this.mnemonic);
      }

      const masterSeed = await this.retrieveMasterSeed(this.mnemonic);
      await this.extractKeyPairs(masterSeed);
      this.storePublicKey();
    } catch (error) {
      console.error("Error:", error);
    }
  }

  // for generating premium wallet:
  async initializePremium() {
    try {
      if (!this.mnemonic) {
        this.mnemonic = await this.generateMnemonic();
        // console.log("Premium wallet Mnemonic phrase:", this.mnemonic);
      }
      const masterSeed = await this.retrieveMasterSeed(this.mnemonic);
      await this.extractKeyPairs(masterSeed);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async generateMnemonic() {
    const mnemonic = await bip39.generateMnemonic();
    return mnemonic;
  }

  async retrieveMasterSeed(mnemonic) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const masterSeed = seed.slice(0, 32).toString("hex");
    console.log(
      "User master seed from mnemonic in generateMasterSeedFromMnemonic is:",
      masterSeed
    );
    return masterSeed;
  }

  async extractKeyPairs(masterSeed) {
    const privateKey = crypto
      .createHash("sha256")
      .update(masterSeed)
      .digest("hex");
    this.keyPair = this.ec.keyFromPrivate(privateKey);
    this.publicKey = this.keyPair.getPublic("hex");
    this.privateKey = privateKey;
  }

  storePublicKey() {
    const formData = new FormData();
    formData.append("username", this.username);
    formData.append("publicKey", this.publicKey);

    axios
      .post("./app/php/store_public_key.php", formData)
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  async generateMasterSeedFromMnemonic(userMnemonic) {
    const seed = await bip39.mnemonicToSeed(userMnemonic);
    const userMasterSeed = seed.slice(0, 32).toString("hex");
    //console.log('User master seed from mnemonic in generateMasterSeedFromMnemonic is:', userMasterSeed);
    console.log(
      "User entered mnemonic mnemonic on generateMasterSeedFromMnemonic is:",
      userMnemonic
    );

    const wallet = new Wallet("", userMnemonic); // Pass an empty string as username and userMnemonic
    await wallet.extractKeyPairs(userMasterSeed);

    //console.log('wallet.publicKey:', wallet.publicKey);
    //console.log('Private Key:', wallet.privateKey);

    return {
      masterSeed: userMasterSeed,
      publicKey: wallet.publicKey,
      privateKeyBuffer: Buffer.from(wallet.privateKey, "hex"), // Return privateKeyBuffer instead of privateKey
    };
  }

  async signTransaction(transaction, privateKeyBuffer) {
    const privateKey = privateKeyBuffer.toString("hex");
    const ec = new EC("secp256k1");
    //This line creates a new instance of the Elliptic Curve (EC)
    //library with the specified elliptic curve algorithm "secp256k1."
    //This algorithm is commonly used in cryptocurrencies, including Bitcoin.
    const key = ec.keyFromPrivate(privateKey);
    // creates a key object from the private key using the
    //elliptic curve library. The key object will be used to sign the transaction.
    transaction.signTransaction(key);
    console.log("Signed Transaction:", transaction);

    // Return the signed transaction
    return transaction;
  }
  async signPremiumTransaction(premiumTransaction, premiumPrivateKey) {
    const ec = new EC("secp256k1");
    const key = ec.keyFromPrivate(premiumPrivateKey);
    premiumTransaction.signTransaction(key);
    console.log("Signed Premium wallet Transaction:", premiumTransaction);

    // Return the signed transaction
    return premiumTransaction;
  }
}

// Attach the Transaction class to the window object
if (typeof window !== "undefined") {
  const wallet = new Wallet();
  window.Wallet = Wallet;
  window.walletInstance = wallet;
}
const wallet = new Wallet();
module.exports = Wallet;
