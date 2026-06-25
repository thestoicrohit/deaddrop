import { useEffect, useRef } from 'react'
import { useAccount }         from 'wagmi'
import { useAppStore }        from '@/store/useAppStore'

/**
 * Keeps the Zustand wallet state in sync with wagmi's account state.
 * Call this once at the App level.
 */
export function useWalletSync() {
  const { address, isConnected } = useAccount()
  const { connectWallet, disconnectWallet, walletAddress, demoMode } = useAppStore()
  const prevAddress = useRef(null)

  useEffect(() => {
    if (isConnected && address) {
      // Wagmi connected — sync address to store if it changed
      if (address !== walletAddress) {
        connectWallet(address)
      }
      prevAddress.current = address
    } else if (!isConnected && !demoMode && prevAddress.current) {
      // Wagmi disconnected (user rejected in MetaMask or switched to no account)
      // Only disconnect the store if the current address came from a real wallet
      const isDemoAddr = walletAddress === '0x3f7a9b2d4e1c8f5a6b0d9e2c7f4a1b8e5c2d9f6a'
      if (!isDemoAddr) {
        disconnectWallet()
        prevAddress.current = null
      }
    }
  }, [isConnected, address])
}
