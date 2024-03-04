import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { mplex } from "@libp2p/mplex";
import { tcp } from "@libp2p/tcp";
import { createLibp2p } from "libp2p";
import { identifyService } from "libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { mdns } from "@libp2p/mdns";
import WebSocket, { WebSocketServer } from "ws";

// Custom topics
const topics = [
  `newTransactionTopic._peer-discovery._p2p._pubsub`,
  `sendBalanceTopic._peer-discovery._p2p._pubsub`,
  `checkBalanceTopic._peer-discovery._p2p._pubsub`,
  `getChainTopic._peer-discovery._p2p._pubsub`,
  `newGetCryptoRequestTopic._peer-discovery._p2p._pubsub`,
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

async function bridgeNodeSetUp() {
  // Create a new libp2p node.
  const bridgeNode = await createNode();

  // Start the node.
  await bridgeNode.start();

  console.log("starting bridge node");
  bridgeNode.addEventListener("peer:discovery", (evt) =>
    console.log(`bridge node discovered:`, evt.detail.id.toString())
  );
  const wss = new WebSocketServer({ port: 9003 });
  wss.setMaxListeners(1000);
  wss.on("listening", () => {
    console.log("WebSocket server started on port 9003");
  });
  let blocks = null;
  bridgeNode.services.pubsub.addEventListener("message", async (message) => {
    const checkTopic = `${message.detail.topic}`;

    if (checkTopic === "sendBalanceTopic") {
      try {
        // Message contains user balance and address
        const rawMessage = JSON.parse(
          new TextDecoder().decode(message.detail.data)
        );
        // console.log("rawMessage:", rawMessage);
        const balance = rawMessage[0];
        const address = rawMessage[1];
        // console.log("fetched balance from fullnode: ", balance);
        //console.log("fetched address from fullnode: ", address);
        // Do something with the extracted balance and address
        try {
          const message = JSON.stringify({ balance, address });
          //console.log("stringifiedMessage:", message);
          sendBalanceToClient(wss, message);
        } catch (error) {
          console.log("error triggering sendBalanceToClient");
        }
      } catch (jsonParseError) {
        console.log("Non json balance + adderss received");
        return; // Skip further processing for non-JSON data
      }
    } else if (checkTopic === "getChainTopic") {
      try {
        blocks = JSON.parse(new TextDecoder().decode(message.detail.data));
        // console.log("bridgenode deserialized chainOFBlocks:", blocks);
        sendBlocksToClient(wss, blocks);
      } catch (jsonParseError) {
        return; // Skip further processing for non-JSON data
      }
    }
  });

  // Subscribe to the 'transactionTopic' topic
  try {
    bridgeNode.services.pubsub.subscribe("newTransactionTopic");
    console.log("Successfully subscribed to the 'newTransactionTopic' topic");
  } catch (error) {
    console.error(`Failed to subscribe to 'newTransactionTopic' topic:`, error);
  }

  try {
    bridgeNode.services.pubsub.subscribe("checkBalanceTopic");
    console.log("Successfully subscribed to the 'checkBalanceTopic' topic");
  } catch (error) {
    console.error(`Failed to subscribe to 'checkBalanceTopic' topic:`, error);
  }
  try {
    bridgeNode.services.pubsub.subscribe("sendBalanceTopic");
    console.log("Successfully subscribed to the 'sendBalanceTopic' topic");
  } catch (error) {
    console.error(`Failed to subscribe to 'sendBalanceTopic' topic:`, error);
  }

  try {
    bridgeNode.services.pubsub.subscribe("getChainTopic");
    console.log("Successfully subscribed to the 'getChainTopic' topic");
  } catch (error) {
    console.error(`Failed to subscribe to 'getChainTopic' topic:`, error);
  }

  try {
    bridgeNode.services.pubsub.subscribe("newGetCryptoRequestTopic");
    console.log(
      "Successfully subscribed to the 'newGetCryptoRequestTopic' topic"
    );
  } catch (error) {
    console.error(
      `Failed to subscribe to 'newGetCryptoRequestTopic' topic:`,
      error
    );
  }

  // Managing web socket connection:
  let eventListenerCount = 0;
  wss.on("connection", (ws) => {
    // Check if the number of event listeners exceeds the limit
    if (eventListenerCount >= 10) {
      // Reject the new connection if the limit is exceeded
      //  ws.close();
      //   console.warn(
      //    `Maximum number of WebSocket connections reached. Connection rejected.`
      //  );
      // return;
    }

    // Increment the event listener count
    eventListenerCount++;
    //console.log("eventListenerCount:", eventListenerCount);
    // console.log("Max listeners for WebSocketServer:", wss.getMaxListeners());

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        if (data.command === "getTransaction") {
          // Process the 'getTransaction' command
          if (data.data) {
            const message = data.data;
            publishUserMessage(bridgeNode, message);
          }
        } else if (data.command === "getCrypto") {
          if (data.data) {
            console.log("sucessfully received buy crypto order");
            // Log buyAmount and userAddress
            const buyAmount = data.data.buyAmount;
            const userAddress = data.data.userAddress;
            console.log("buyAmount:", buyAmount);
            console.log("userAddress:", userAddress);
            const message = JSON.stringify(data.data);
            publishBuyCryptoMessage(bridgeNode, message);
          }
        } else if (data.command === "getBalance" && data.address) {
          //getting user address in order to get his balance
          const addressMessage = data.address;
          getBalance(bridgeNode, addressMessage);
        } else if (data.command === "getBlocks") {
          // Retrieve all blocks from the blockchain
          getBlocks(bridgeNode);
          if (blocks !== null) {
            // console.log("WANTED SENDED GET ALL BLOCKS TO CLIENT:", blocks);
            // Send the blocks data back to the client through WebSocket
            ws.send(JSON.stringify({ blocks }));
          }
        } else {
          console.error("Invalid message format:", message);
        }
      } catch (error) {
        console.error("Invalid message format:", message);
      }
    });

    ws.on("close", () => {
      // Decrement the event listener count when the connection is closed
      eventListenerCount--;
      // console.log("eventListenerCount:", eventListenerCount);
    });
  });

  // publishing user address to full nodes to retrieve balance
  async function getBalance(bridgeNode, addressMessage) {
    const message = addressMessage;

    try {
      bridgeNode.services.pubsub.publish(
        "checkBalanceTopic",
        new TextEncoder().encode(message)
      );

      // console.log(`Successfully published to 'checkBalanceTopic': ${message}`);
    } catch (error) {
      console.error(`Failed to publish to 'checkBalanceTopic':`, error);
    }
  }
  //sending balance to client
  function sendBalanceToClient(wss, message) {
    try {
      wss.on("connection", (ws) => {
        // Create a WebSocket message
        const messageToSend = {
          type: "getBalanceResponse",
          message,
        };
        // console.log("messageToSend:", messageToSend);

        // Send the message to the
        try {
          ws.send(JSON.stringify(messageToSend));
          //console.log("balance has been sent to client", messageToSend);
        } catch (error) {
          console.error("fatal error", error);
        }
      });
    } catch (error) {
      console.error("error sending balance from bridgenode to client side");
    }
  }

  function sendBlocksToClient(wss, blocks) {
    try {
      wss.on("connection", (ws) => {
        // Create a WebSocket message
        const messageToSend = {
          type: "getBlocks",
          blocks,
        };

        // Send the message to the
        try {
          ws.send(JSON.stringify(messageToSend));
          //  console.log("blocks has been sent to client");
          //ws.close();
        } catch (error) {
          console.error("fatal error", error);
        }
      });
    } catch (error) {
      console.error("error sending balance from bridgenode to client side");
    }
  }
}

// Function to publish a message
async function publishUserMessage(bridgeNode, message) {
  try {
    await bridgeNode.services.pubsub.publish(
      "newTransactionTopic",
      new TextEncoder().encode(message)
    );

    console.log(
      `Successfully published to 'newTransactionTopic' topic: ${message}`
    );
  } catch (error) {
    console.error(`Failed to publish to 'newTransactionTopic' topic:`, error);
  }
}

// Function to publish a message
async function publishBuyCryptoMessage(bridgeNode, message) {
  try {
    await bridgeNode.services.pubsub.publish(
      "newGetCryptoRequestTopic",
      new TextEncoder().encode(message)
    );

    console.log(
      `Successfully published to 'newGetCryptoRequestTopic' topic: ${message}`
    );
  } catch (error) {
    console.error(`Failed to publish to 'newTransactionTopic' topic:`, error);
  }
}

async function getBlocks(bridgeNode) {
  const request = "getBlocksRequest";
  const message = JSON.stringify(request);
  try {
    bridgeNode.services.pubsub.publish(
      "getChainTopic",
      new TextEncoder().encode(message)
    );

    //  console.log(`Successfully published to 'getChainTopic': ${message}`);
  } catch (error) {
    console.error(`Failed to publish to 'getChainTopic':`, error);
  }
}
bridgeNodeSetUp();
