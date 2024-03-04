const path = require("path");

module.exports = {
  mode: "development",
  entry: {
    wallet: "./wallet.js",
    pool: "./pool.js",
    transaction: "./transaction.js",
    proofOfWork: "./proofOfWork.js",
    block: "./block.js",
    blockConfig: "./blockConfig.js",
    blockchain: "./blockchain.mjs",
  },

  output: {
    filename: (pathData) => {
      if (pathData.chunk.name === "blockchain") {
        return "[name].mjs";
      } else {
        return "[name].js";
      }
    },
    path: path.resolve(__dirname, "dist"),
  },

  resolve: {
    extensions: [".js", ".mjs"],
    fallback: {
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
      crypto: require.resolve("crypto-browserify"),
      util: require.resolve("util/"),
      fs: false,
      path: require.resolve("path-browserify"),
      os: require.resolve("os-browserify"),
      zlib: require.resolve("browserify-zlib"),
      querystring: require.resolve("querystring-es3"),
      http: require.resolve("stream-http"),
      url: require.resolve("url/"),
      assert: require.resolve("assert/"),
      async_hooks: false,
    },
    alias: {
      elliptic: "elliptic",
    },
  },

  target: "web",
};
