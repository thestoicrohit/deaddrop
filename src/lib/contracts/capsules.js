// ─────────────────────────────────────────────────────────────────────────────
// DeadDropCapsules — contract address + ABI
//
// ABI is pulled verbatim from the compiled artifact
// (artifacts/contracts/DeadDropCapsules.sol/DeadDropCapsules.json) so it can never drift from
// the actual deployed bytecode. Regenerate with:
//   node scripts/gen-contract-modules.mjs   (after `npm run compile`)
//
// After deploying, set VITE_CAPSULES_ADDRESS in your .env file.
// Run:  npm run deploy:sepolia   (or deploy:local for a local Hardhat node)
// ─────────────────────────────────────────────────────────────────────────────

export const CAPSULES_ADDRESS = import.meta.env.VITE_CAPSULES_ADDRESS || null

// DeadDropCapsules.sol ABI — 14 functions, 4 events
export const CAPSULES_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "enum DeadDropCapsules.CapsuleType",
        "name": "capsuleType",
        "type": "uint8"
      }
    ],
    "name": "CapsuleCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "itemId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum DeadDropCapsules.ContentType",
        "name": "itemType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "cid",
        "type": "string"
      }
    ],
    "name": "ContentAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "itemId",
        "type": "uint256"
      }
    ],
    "name": "ContentRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "reactor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "reactionIndex",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "on",
        "type": "bool"
      }
    ],
    "name": "Reacted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "internalType": "enum DeadDropCapsules.ContentType",
        "name": "itemType",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "cid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "label",
        "type": "string"
      }
    ],
    "name": "addContent",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "itemId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "capsuleCount",
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
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "capsules",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "enum DeadDropCapsules.CapsuleType",
        "name": "capsuleType",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "contentPreview",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "circleId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "unlockDate",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      }
    ],
    "name": "contentCount",
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
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "enum DeadDropCapsules.CapsuleType",
        "name": "capsuleType",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "contentPreview",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "circleId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "unlockDate",
        "type": "uint256"
      }
    ],
    "name": "createCapsule",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      }
    ],
    "name": "deleteCapsule",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      }
    ],
    "name": "getContent",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "enum DeadDropCapsules.ContentType",
            "name": "itemType",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "cid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "label",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "addedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct DeadDropCapsules.ContentItem[]",
        "name": "",
        "type": "tuple[]"
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
    "name": "getMyCapsules",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      }
    ],
    "name": "getReactions",
    "outputs": [
      {
        "internalType": "uint256[3]",
        "name": "",
        "type": "uint256[3]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserReactions",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      }
    ],
    "name": "isUnlocked",
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
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "reactionIndex",
        "type": "uint8"
      }
    ],
    "name": "react",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "itemId",
        "type": "uint256"
      }
    ],
    "name": "removeContent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "capsuleId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contentPreview",
        "type": "string"
      }
    ],
    "name": "updateCapsule",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
