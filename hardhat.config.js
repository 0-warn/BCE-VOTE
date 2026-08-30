// Hardhat config. Loads secrets from .env (never commit your real .env).
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";

module.exports = {
  solidity: "0.8.19",

  networks: {
    // The in-process chain Hardhat spins up for tests.
    hardhat: {},

    // Local node started with `npx hardhat node`.
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // Public testnet. RPC URL + private key come from .env.
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};