// ─────────────────────────────────────────────────────────────────────────────
// DeadDropVault — contract address + ABI
//
// ABI is pulled verbatim from the compiled artifact
// (artifacts/contracts/DeadDropVault.sol/DeadDropVault.json) so it can never drift from
// the actual deployed bytecode. Regenerate with:
//   node scripts/gen-contract-modules.mjs   (after `npm run compile`)
//
// After deploying, set VITE_VAULT_ADDRESS in your .env file.
// Run:  npm run deploy:sepolia   (or deploy:local for a local Hardhat node)
// ─────────────────────────────────────────────────────────────────────────────

// Accept both VITE_VAULT_ADDRESS (new) and VITE_CONTRACT_ADDRESS (legacy) so
// existing .env files keep working without a redeploy.
export const VAULT_ADDRESS =
  import.meta.env.VITE_VAULT_ADDRESS ||
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  null

// DeadDropVault.sol ABI — 15 functions, 9 events
export const VAULT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "BeneficiariesSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "ETHDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "GracePeriodCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "name": "GracePeriodStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalETH",
        "type": "uint256"
      }
    ],
    "name": "LegacyReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "confirmer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "MultiSigConfirmed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PingRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "SettingsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "threshold",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gracePeriod",
        "type": "uint256"
      }
    ],
    "name": "VaultCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "claimLegacy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_thresholdDays",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_graceDays",
        "type": "uint256"
      }
    ],
    "name": "createVault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "depositETH",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getBeneficiaries",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "wallets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "shares",
        "type": "uint256[]"
      },
      {
        "internalType": "string[]",
        "name": "names",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getNextPingDeadline",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getVaultCIDs",
    "outputs": [
      {
        "internalType": "string",
        "name": "metadataCID",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "finalMessageCID",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getVaultInfo",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "state",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "lastPing",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "inactivityThreshold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "gracePeriodDuration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "gracePeriodStart",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "depositedETH",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "multiSig",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "beneficiaryCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "hasVault",
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
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "isGracePeriodOver",
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
    "inputs": [],
    "name": "ping",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address payable[]",
        "name": "_wallets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_sharesBPS",
        "type": "uint256[]"
      },
      {
        "internalType": "string[]",
        "name": "_names",
        "type": "string[]"
      }
    ],
    "name": "setBeneficiaries",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "triggerGracePeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_thresholdDays",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_graceDays",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_multiSig",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "_metadataCID",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_finalMessageCID",
        "type": "string"
      }
    ],
    "name": "updateSettings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "vaultOwners",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes", "name": "", "type": "bytes" }
    ],
    "name": "checkUpkeep",
    "outputs": [
      { "internalType": "bool",  "name": "upkeepNeeded", "type": "bool" },
      { "internalType": "bytes", "name": "performData",  "type": "bytes" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes", "name": "performData", "type": "bytes" }
    ],
    "name": "performUpkeep",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
