require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const path = require("path");
const fs   = require("fs");

// Some sandboxed/offline environments can't reach binaries.soliditylang.org to
// download the solc binary. When that happens, fall back to the npm `solc`
// package's bundled soljson.js (already installed in node_modules) instead of
// failing the build. On a machine with normal internet access, runSuper(args)
// succeeds and this fallback never triggers.
const LOCAL_SOLCJS_PATH = path.join(__dirname, "node_modules", "solc", "soljson.js");

subtask("compile:solidity:solc:get-build").setAction(async (args, hre, runSuper) => {
  try {
    return await runSuper(args);
  } catch (err) {
    if (!fs.existsSync(LOCAL_SOLCJS_PATH)) throw err;
    return {
      compilerPath: LOCAL_SOLCJS_PATH,
      isSolcJs:     true,
      version:      args.solcVersion,
      longVersion:  `${args.solcVersion}+commit.local`,
    };
  }
});

const SEPOLIA_RPC_URL    = process.env.SEPOLIA_RPC_URL    || "https://eth-sepolia.g.alchemy.com/v2/demo";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: { url: SEPOLIA_RPC_URL, accounts: [DEPLOYER_PRIVATE_KEY], chainId: 11155111 },
  },
  paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
  gasReporter: { enabled: process.env.REPORT_GAS === "true" },
};
