// ─────────────────────────────────────────────────────────────────────────────
// DeadDropKeyRegistry — contract address + ABI
//
// ABI is pulled verbatim from the compiled artifact
// (artifacts/contracts/DeadDropKeyRegistry.sol/DeadDropKeyRegistry.json) so it can never drift from
// the actual deployed bytecode. Regenerate with:
//   node scripts/gen-contract-modules.mjs   (after `npm run compile`)
//
// After deploying, set VITE_KEY_REGISTRY_ADDRESS in your .env file.
// Run:  npm run deploy:sepolia   (or deploy:local for a local Hardhat node)
// ─────────────────────────────────────────────────────────────────────────────

export const KEY_REGISTRY_ADDRESS = import.meta.env.VITE_KEY_REGISTRY_ADDRESS || null

// DeadDropKeyRegistry.sol ABI — 3 functions, 1 events
export const KEY_REGISTRY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "PublicKeyRegistered",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "who",
        "type": "address"
      }
    ],
    "name": "getPublicKey",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "who",
        "type": "address"
      }
    ],
    "name": "hasPublicKey",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "pubKey",
        "type": "bytes"
      }
    ],
    "name": "registerPublicKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
