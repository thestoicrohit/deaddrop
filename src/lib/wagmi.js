import { createConfig, http } from 'wagmi'
import { sepolia }            from 'wagmi/chains'
import { injected }           from 'wagmi/connectors'

const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY
const rpcUrl     = alchemyKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : 'https://rpc.sepolia.org' // public fallback (rate-limited, fine for dev)

export const wagmiConfig = createConfig({
  chains:      [sepolia],
  connectors:  [injected()],   // MetaMask and any EIP-1193 wallet
  transports:  { [sepolia.id]: http(rpcUrl) },
})

export { sepolia }
