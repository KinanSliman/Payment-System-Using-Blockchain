import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { mplex } from "@libp2p/mplex";
import { tcp } from "@libp2p/tcp";
import { createLibp2p } from "libp2p";
import { identifyService } from "libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { mdns } from "@libp2p/mdns";
import Blockchain from "./blockchain.mjs";
import WebSocket, { WebSocketServer } from "ws";
import Pool from "./pool.js";
import Transaction from "./transaction.js";
import ProofOfWork from "./proofOfWork.js";
import Wallet from "./Wallet.js";
import fs from "fs";
import Block from "./block.js";

// Custom topics
const topics = [
  `newTransactionTopic._peer-discovery._p2p._pubsub`,
  `newBlockTopic._peer-discovery._p2p._pubsub`,
  `sendBalanceTopic._peer-discovery._p2p._pubsub`,
  `checkBalanceTopic._peer-discovery._p2p._pubsub`,
  `getChainTopic._peer-discovery._p2p._pubsub`,
  `newGetCryptoRequestTopic._peer-discovery._p2p._pubsub`,
  `syncBlockchain._peer-discovery._p2p._pubsub`,
];

const options = {
  emitSelf: true,
  gossipIncoming: true,
  fallbackToFloodsub: true,
  floodPublish: true,
  signMessages: false,
  strictSigning: false,
};

const createNode = () => {
  return createLibp2p({
    //dht: kadDHT(),
    addresses: {
      listen: ["/ip4/0.0.0.0/tcp/0"],
    },
    transports: [tcp()],
    streamMuxers: [yamux(), mplex()],
    connectionEncryption: [noise()],
    peerDiscovery: [
      mdns({
        interval: 20e3,
      }),
      pubsubPeerDiscovery({
        interval: 60000,
        topics: topics, // defaults to ['_peer-discovery._p2p._pubsub']
        listenOnly: false,
      }),
    ],
    services: {
      pubsub: gossipsub(options),
      identify: identifyService(),
    },
  });
};

async function createNodes(numNodes) {
  const nodes = [];
  const nodePromises = [];

  for (let i = 0; i < numNodes; i++) {
    const nodePromise = new Promise(async (resolve, reject) => {
      try {
        const node = await createNode();
        nodes.push(node);
        console.log(`FullNode ${i + 1} created.`);
        resolve(node);
      } catch (error) {
        console.error(`Error creating FullNode ${i + 1}:`, error);
        reject(error);
      }
    });

    nodePromises.push(nodePromise);
  }

  // Wait for all nodes to be created before continuing
  await Promise.all(nodePromises);

  return nodes;
}

async function main() {
  const numNodes = 1; // Change the number of nodes as needed
  const nodes = await createNodes(numNodes);
  // Access information from the file created in the previous script
  const filePath = "./premiumWalletInfo.json";
  let premiumWallet;
  try {
    // Read the content of the file
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Parse the JSON content
    premiumWallet = JSON.parse(fileContent);

    // Access the information
    console.log("Premium Wallet Address:", premiumWallet.publicKey);
    console.log("Premium Wallet Private Key:", premiumWallet.privateKey);
    console.log("Premium Wallet Mnemonic:", premiumWallet.mnemonic);
  } catch (error) {
    console.error("Error reading or parsing the file:", error);
  }

  nodes.forEach(async (node, index) => {
    node.addEventListener("peer:discovery", (evt) =>
      console.log(`FullNode ${index + 1} Discovered:`, evt.detail.id.toString())
    );

    const pool = new Pool();
    console.log("creating FullNode local pool");
    const gossip = gossipsub(node, options);
    // Create a Blockchain instance and pass the libp2p object
    const wallet = new Wallet();
    const premiumWalletPublicKey = premiumWallet.publicKey;
    const blockchain = new Blockchain(
      node,
      index,
      gossip,
      premiumWalletPublicKey
    );
    blockchain.createGenesisBlock(premiumWallet);
    //UPDATE AND SYNC BLOCKCHAIN
    // Define a new array to store pending transactions
    const pendingTransactions = [];
    node.services.pubsub.addEventListener("message", (message) => {
      const checkTopic = `${message.detail.topic}`;

      if (checkTopic === "newTransactionTopic") {
        try {
          const receivedTransaction = Transaction.deserialize(
            new TextDecoder().decode(message.detail.data)
          );

          if (receivedTransaction.isValid()) {
            // Check if there are transactions from the same fromAddress in the pool
            const transactionsWithSameAddressInPool = pool
              .getTransactions()
              .filter(
                (transaction) =>
                  transaction.fromAddress === receivedTransaction.fromAddress
              );
            console.log(
              "transactionsWithSameAddressInPool",
              transactionsWithSameAddressInPool
            );

            if (transactionsWithSameAddressInPool.length > 0) {
              console.log(
                `Transactions from the same address ${receivedTransaction.fromAddress} are already in the pool. Holding the received transaction.`
              );
              // Store the received transaction in the pendingTransactions array
              pendingTransactions.push(receivedTransaction);
            } else {
              // Add a 45-second delay before checking the user's balance
              setTimeout(async () => {
                const userBalance = blockchain.getBalanceForAddress(
                  receivedTransaction.fromAddress
                );
                console.log(
                  "userBalance is:",
                  userBalance,
                  "receivedTransaction.amount is:",
                  receivedTransaction.amount
                );

                if (userBalance >= receivedTransaction.amount) {
                  const latestBlock = blockchain.getLatestBlock();
                  const transactionsInLatestBlock = latestBlock.transactions;
                  const isTransactionInLatestBlock =
                    transactionsInLatestBlock.some(
                      (transaction) =>
                        transaction.nonce === receivedTransaction.nonce
                    );

                  if (
                    !pool.isNonceInPool(receivedTransaction.nonce) &&
                    !isTransactionInLatestBlock
                  ) {
                    pool.addTransaction(receivedTransaction);
                    console.log("Transaction added to the pool.");
                  } else {
                    console.log(
                      "Transaction with the same nonce already exists in the pool or the latest block. Not added."
                    );
                  }
                } else {
                  console.log(
                    "Insufficient funds. Transaction not added to the pool."
                  );
                }
              }, 500); // 0.1 sec delay (in milliseconds)
            }
          } else {
            console.log("Received transaction is not valid.");
          }
        } catch (error) {
          console.error(`Received message is not a valid transaction`, error);
        }
      } else if (checkTopic === "newBlockTopic") {
        try {
          try {
            const blockData = new TextDecoder().decode(message.detail.data);
            let deSerializedNewBlock;
            try {
              deSerializedNewBlock = blockData;
              // Introduce a delay of 30 seconds before calling ReceivedBlockFromGossipNodes
              setTimeout(() => {
                blockchain.ReceivedBlockFromGossipNodes(deSerializedNewBlock);
              }, 15000); // 30 seconds in milliseconds
            } catch (jsonParseError) {
              return; // Skip further processing for non-JSON data
            }
          } catch (error) {}
        } catch (error) {
          console.error("ERROR RECEIVING NEW BLOCK:", error);
        }
      } else if (checkTopic === "checkBalanceTopic") {
        try {
          const address = new TextDecoder().decode(message.detail.data);
          // console.log(
          //  "FullNode:",
          //  `Node ${index + 1} :`,
          //  " USER Address:",
          //  typeof address,
          //  address
          // );
          if (typeof address !== undefined) {
            const balance = blockchain.getBalanceForAddress(address);
            //  console.log(
            //    "FullNode:",
            //   `Node ${index + 1} :`,
            //   " USER BALANCE:",
            //   balance
            // );

            publishUserBalance(balance, address);
          }
        } catch (jsonParseError) {
          return; // Skip further processing for non-JSON data
        }
      } else if (checkTopic === "newGetCryptoRequestTopic") {
        try {
          const getCryptoMessage = JSON.parse(
            new TextDecoder().decode(message.detail.data)
          );
          const userAddress = getCryptoMessage.userAddress;
          const buyAmount = getCryptoMessage.buyAmount;
          const amount = buyAmount;
          const toAddress = userAddress;
          const fromAddress = premiumWallet.publicKey;
          const nonce = Math.floor(Math.random() * Math.pow(2, 32));
          const premiumTransaction = new Transaction(
            fromAddress,
            toAddress,
            amount,
            nonce
          );
          const premiumPrivateKey = premiumWallet.privateKey;
          try {
            wallet.signPremiumTransaction(
              premiumTransaction,
              premiumPrivateKey
            );
            pool.addTransaction(premiumTransaction);
            console.log(`Node ${index + 1} :`, "Full Node mempool", pool);
            startConsensus(pool);
          } catch (error) {
            console.error("fail to sign premium transaction", error);
          }
        } catch (jsonParseError) {
          console.error("Error parsing JSON data:", jsonParseError);
          return; // Skip further processing for non-JSON data
        }
      } else if (checkTopic === "getChainTopic") {
        try {
          const fetchedRequest = JSON.parse(
            new TextDecoder().decode(message.detail.data)
          );
          const request = fetchedRequest;
          if (request === "getBlocksRequest") {
            runChainMessagePublish();
          }
        } catch (jsonParseError) {
          return; // Skip further processing for non-JSON data
        }
      } else if (
        checkTopic === "syncBlockchain" &&
        blockchain.chain.length == 1
      ) {
        try {
          const syncBlockchainResponse = JSON.parse(
            new TextDecoder().decode(message.detail.data)
          );
          console.log("I have received this message:", syncBlockchainResponse);

          try {
            blockchain.chain.pop();
            // Iterate through each block in the received array and add it to the blockchain
            for (const block of syncBlockchainResponse) {
              try {
                blockchain.chain.push(block);
              } catch (error) {
                console.log(
                  "Error deserializing or adding block to blockchain:",
                  error
                );
              }
            }
          } catch (error) {
            console.log("can not pushing new blockchain blockchain");
          }
          console.log(
            "NEWJOINEDFULLNODE BLOCKCHAIN:",
            blockchain.getAllBlocks()
          );

          subscribeToOtherTopics();

          try {
            //  node.services.pubsub.unsubscribe("syncBlockchain");
            // console.log(
            // "Successfully unsubscribe to the 'syncBlockchain' topic"
            //  );
          } catch (error) {
            //  console.log("can not unsubscribe");
          }
        } catch (jsonParseError) {
          return;
        }
      }
    });

    // Function to process pending transactions recursively with a delay
    async function processPendingTransactions() {
      if (pendingTransactions.length > 0) {
        const pendingTransaction = pendingTransactions.shift(); // Get and remove the first transaction

        // Function to handle the processing of the pending transaction
        async function processTransaction() {
          try {
            const userBalance = blockchain.getBalanceForAddress(
              pendingTransaction.fromAddress
            );
            console.log("Processing pending transaction");
            console.log("Pending transaction userBalance", userBalance);
            console.log(
              "PendingTransaction.fromAddress",
              pendingTransaction.fromAddress
            );

            if (userBalance >= pendingTransaction.amount) {
              const latestBlock = blockchain.getLatestBlock();
              const transactionsInLatestBlock = latestBlock.transactions;
              const isTransactionInLatestBlock = transactionsInLatestBlock.some(
                (transaction) => transaction.nonce === pendingTransaction.nonce
              );

              if (
                !pool.isNonceInPool(pendingTransaction.nonce) &&
                !isTransactionInLatestBlock
              ) {
                pool.addTransaction(pendingTransaction);
                console.log("Pending transaction added to the pool.");
              } else {
                console.log(
                  "Pending transaction with the same nonce already exists in the pool or the latest block. Not added."
                );
              }
            } else {
              console.log(
                "Insufficient funds. Pending transaction not added to the pool."
              );
            }
          } catch (error) {
            console.error("Error processing pending transaction:", error);
          }

          // Schedule the next pending transaction after a 1-minute delay
          setTimeout(processPendingTransactions, 60000); // 1 minute delay (in milliseconds)
        }

        // Introduce a 1-minute delay before processing the first transaction
        setTimeout(processTransaction, 60000);
      }
    }

    // Set interval to run processPendingTransactions every 10 seconds (to check if there are pending transactions)
    const checkPendingTransactionsInterval = 30000; // 10 seconds in milliseconds

    setInterval(async () => {
      if (pendingTransactions.length > 0) {
        await processPendingTransactions();
      }
    }, checkPendingTransactionsInterval);

    async function startConsensus(pool) {
      const run = pool.getTransactions();
      //console.log("run", run);
      if (run.length > 0) {
        console.log("starting consensus");
        const proofOfWork = new ProofOfWork(pool, blockchain);
        await proofOfWork.execute(); // Assuming execute() is asynchronous
        console.log("executing proof of work");
        pool.clear();
      } else {
        console.log("no transaction in the pool");
      }
    }

    const currentTime = new Date();
    const seconds = currentTime.getSeconds();
    const delay = (30 - (seconds % 30)) * 1000;

    setTimeout(async () => {
      await startConsensus(pool);

      // Set interval to check every 30 seconds
      setInterval(async () => {
        await startConsensus(pool);
      }, 30000);
    }, delay);

    async function runChainMessagePublish() {
      try {
        const chainMessage = JSON.stringify(blockchain.getAllBlocks());
        await node.services.pubsub.publish(
          "getChainTopic",
          new TextEncoder().encode(chainMessage)
        );
      } catch (error) {
        console.error(
          "issues publishing chain info from FullNode to bridgenode",
          error
        );
      }
    }

    async function publishUserBalance(balance, address) {
      if (typeof address !== undefined) {
        const arrayMessage = [balance, address];
        const message = JSON.stringify(arrayMessage);
        await node.services.pubsub.publish(
          "sendBalanceTopic",
          new TextEncoder().encode(message)
        );
      }
    }

    try {
      node.services.pubsub.subscribe("syncBlockchain");
      console.log("Successfully subscribed to the 'syncBlockchain' topic");
    } catch (error) {
      console.error(`failed subscription to topic:`, error);
    }
    async function subscribeToOtherTopics() {
      try {
        node.services.pubsub.subscribe("newTransactionTopic");
        console.log(
          "Successfully subscribed to the 'newTransactionTopic' topic"
        );
      } catch (error) {
        console.error(`failed subscription to topic:`, error);
      }

      try {
        node.services.pubsub.subscribe("newBlockTopic");
        console.log("Successfully subscribed to the 'newBlocktopic' topic");
      } catch (error) {
        console.error(`failed subscription to topic:`, error);
      }

      try {
        node.services.pubsub.subscribe("checkBalanceTopic");
        console.log("Successfully subscribed to the 'checkBalanceTopic' topic");
      } catch (error) {
        console.error(
          `Failed to subscribe to 'checkBalanceTopic' topic:`,
          error
        );
      }
      try {
        node.services.pubsub.subscribe("sendBalanceTopic");
        console.log("Successfully subscribed to the 'sendBalanceTopic' topic");
      } catch (error) {
        console.error(
          `Failed to subscribe to 'sendBalanceTopic' topic:`,
          error
        );
      }

      try {
        node.services.pubsub.subscribe("getChainTopic");
        console.log("Successfully subscribed to the 'getChainTopic' topic");
      } catch (error) {
        console.error(`Failed to subscribe to 'getChainTopic' topic:`, error);
      }

      try {
        node.services.pubsub.subscribe("newGetCryptoRequestTopic");
        console.log(
          "Successfully subscribed to the 'newGetCryptoRequestTopic' topic"
        );
      } catch (error) {
        console.error(
          `Failed to subscribe to 'newGetCryptoRequestTopic' topic:`,
          error
        );
      }
    }
  });
}

main();
