import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useAppStore } from '@/store/useAppStore'
import { useWalletSync } from '@/hooks/useWalletSync'

// Layout
import Navbar from '@/components/layout/Navbar'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LangToggle from '@/components/ui/LangToggle'
import AIAssistant from '@/components/ui/AIAssistant'

// Pages
import EntryPage from '@/pages/EntryPage'
import AboutPage from '@/pages/AboutPage'
import ConnectPage from '@/pages/ConnectPage'
import ProfilesPage from '@/pages/ProfilesPage'
import ProfileDetailPage from '@/pages/ProfileDetailPage'
import PrivateSafePage from '@/pages/PrivateSafePage'
import MemorySpacePage from '@/pages/MemorySpacePage'
import LegacyPage from '@/pages/LegacyPage'
import ClaimPage from '@/pages/ClaimPage'
import OrganizationsPage from '@/pages/OrganizationsPage'
import LegalPage from '@/pages/LegalPage'
import DashboardPage from '@/pages/DashboardPage'
import ActivityPage from '@/pages/ActivityPage'

// Page transition wrapper
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const { walletConnected } = useAppStore()
  const isEntry = location.pathname === '/'
  useWalletSync() // keeps wagmi ↔ Zustand in sync

  return (
    <>
      <Navbar />

      {/* No `mode="wait"` — the incoming page mounts immediately rather than
          waiting on the outgoing page's exit animation to finish. Gating
          navigation itself on animation completion is fragile (a throttled
          tab, reduced-motion settings, or a slow device can all stall an
          exit fade indefinitely) for a purely decorative crossfade. */}
      <AnimatePresence initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><EntryPage /></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
          <Route path="/connect" element={<PageWrapper><ConnectPage /></PageWrapper>} />
          <Route path="/profiles" element={<PageWrapper><ProfilesPage /></PageWrapper>} />
          <Route path="/profiles/:id" element={<PageWrapper><ProfileDetailPage /></PageWrapper>} />
          <Route path="/safe" element={<PageWrapper><PrivateSafePage /></PageWrapper>} />
          <Route path="/memory" element={<PageWrapper><MemorySpacePage /></PageWrapper>} />
          <Route path="/legacy" element={<PageWrapper><LegacyPage /></PageWrapper>} />
          <Route path="/claim" element={<PageWrapper><ClaimPage /></PageWrapper>} />
          <Route path="/dashboard" element={<PageWrapper><DashboardPage /></PageWrapper>} />
          <Route path="/activity" element={<PageWrapper><ActivityPage /></PageWrapper>} />
          <Route path="/organizations" element={<PageWrapper><OrganizationsPage /></PageWrapper>} />
          <Route path="/privacy" element={<PageWrapper><LegalPage /></PageWrapper>} />
          <Route path="/terms" element={<PageWrapper><LegalPage /></PageWrapper>} />
        </Routes>
      </AnimatePresence>

      {/* Global floating UI — hidden on entry */}
      {!isEntry && (
        <>
          <ThemeToggle />
          <LangToggle />
          <AIAssistant />
        </>
      )}
    </>
  )
}

function ThemeInitializer() {
  const { theme } = useAppStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeInitializer />
      <div
        className="min-h-screen transition-colors duration-400"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <AppRoutes />
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(var(--c-0-rgb),0.96)',
            color: 'var(--c-5)',
            border: '1px solid rgba(var(--c-4-rgb),0.2)',
            backdropFilter: 'blur(10px)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            borderRadius: '12px',
          },
          success: {
            iconTheme: { primary: 'var(--c-4)', secondary: 'var(--c-5)' },
          },
          error: {
            iconTheme: { primary: 'var(--c-2)', secondary: 'var(--c-5)' },
          },
        }}
      />
    </BrowserRouter>
  )
}
