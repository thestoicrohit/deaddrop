import { create } from 'zustand'
import { persist } from 'zustand/middleware'
const INITIAL_AI_MESSAGES = [
  {
    role: 'assistant',
    content: "Hello. I'm watching over your vault. What would you like to explore today?",
    timestamp: new Date().toISOString(),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DeadDrop app store — UI/session state only.
//
// All substantive app data (circles, capsules, private safe entries,
// credentials, activity) now lives on-chain and is read/written through the
// hooks in src/hooks/ (useDeadDrop, useCircles, useCapsules, useSafe,
// useCredentials, useActivity) — never through this store. This store keeps
// only things that are inherently local to a browser session: theme/language
// preferences, onboarding progress, the connected-wallet snapshot synced by
// useWalletSync, and the AI assistant's chat transcript (which is just a UI
// log, not app data).
// ─────────────────────────────────────────────────────────────────────────────

// ── Tiny unique-id helper ────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

// ── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({

      // ── Theme ────────────────────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark',  next === 'dark')
        document.documentElement.classList.toggle('light', next === 'light')
      },

      // ── Language ─────────────────────────────────────────────────────────────
      lang: 'en',
      toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'hi' : 'en' })),

      // ── Wallet / identity ────────────────────────────────────────────────────
      walletAddress: null,
      walletConnected: false,
      displayName: null,
      profilePhoto: null,
      safePin: null,

      connectWallet: (address) => set({ walletAddress: address, walletConnected: true }),
      disconnectWallet: () =>
        set({
          walletAddress: null, walletConnected: false,
          displayName: null, profilePhoto: null,
          safeUnlocked: false, activeProfile: null,
        }),
      setDisplayName:    (name) => set({ displayName: name }),
      setProfilePhoto:   (url)  => set({ profilePhoto: url }),
      setSafePin:        (pin)  => set({ safePin: pin }),
      updateDisplayName: (name) => set({ displayName: name }),
      updatePin:         (pin)  => set({ safePin: pin }),

      // ── Onboarding ───────────────────────────────────────────────────────────
      onboardingStep: 0,
      onboardingComplete: false,
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ onboardingComplete: true, onboardingStep: 0 }),

      onboardingChecklistDone: false,
      dismissOnboardingChecklist: () => set({ onboardingChecklistDone: true }),

      // ── Demo mode ────────────────────────────────────────────────────────────
      demoMode: false,
      setDemoMode: (v) => set({ demoMode: v }),

      // ── AI panel ─────────────────────────────────────────────────────────────
      aiOpen: false,
      setAiOpen: (v) => set({ aiOpen: v }),

      // ── Active profile (navigation context — holds an on-chain circle id/object) ──
      activeProfile: null,
      setActiveProfile: (p) => set({ activeProfile: p }),

      // ── Vault unlock (session-only, not persisted) ────────────────────────────
      safeUnlocked: false,
      setSafeUnlocked: (v) => set({ safeUnlocked: v }),

      // ── Emergency contact ─────────────────────────────────────────────────────
      emergencyContact: null,
      setEmergencyContact: (contact) => set({ emergencyContact: contact }),

      // ════════════════════════════════════════════════════════════════════════
      // AI MESSAGES  (chat transcript only — not app data)
      // ════════════════════════════════════════════════════════════════════════
      aiMessages: [...INITIAL_AI_MESSAGES],

      addAiMessage: (msg) =>
        set((s) => ({ aiMessages: [...s.aiMessages, msg] })),

      clearAiMessages: () =>
        set({ aiMessages: [...INITIAL_AI_MESSAGES] }),

      // ════════════════════════════════════════════════════════════════════════
      // NOTIFICATIONS  (local toasts/log of in-app events — not on-chain state)
      // ════════════════════════════════════════════════════════════════════════
      notifications: [],

      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { id: uid(), ...n, time: new Date().toISOString(), read: false },
            ...s.notifications.slice(0, 49),
          ],
        })),

      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      clearNotifications: () => set({ notifications: [] }),

      // ════════════════════════════════════════════════════════════════════════
      // DATA MANAGEMENT  (local/session state only — on-chain data has no
      // local copy to import/export/reset)
      // ════════════════════════════════════════════════════════════════════════

      // Import a JSON backup of local preferences (theme/lang/AI transcript/etc).
      importVault: (data) => {
        const allowed = [
          'displayName', 'profilePhoto', 'safePin', 'onboardingComplete', 'demoMode',
          'theme', 'lang', 'aiMessages', 'notifications', 'emergencyContact',
        ]
        const imported = {}
        allowed.forEach(k => { if (data[k] !== undefined) imported[k] = data[k] })
        set(imported)
      },

      // Wipe local session/UI state — does not touch on-chain data, since this
      // store no longer holds any.
      resetAll: () => {
        set({
          walletAddress: null, walletConnected: false,
          displayName: null, profilePhoto: null, safePin: null,
          onboardingComplete: false, demoMode: false,
          activeProfile: null, safeUnlocked: false,
          aiMessages:    [...INITIAL_AI_MESSAGES],
          notifications: [],
          onboardingChecklistDone: false,
          emergencyContact: null,
        })
      },
    }),

    // ── Persistence config ────────────────────────────────────────────────────
    {
      name: 'deaddrop-store',
      partialize: (s) => ({
        // Identity & settings
        theme:              s.theme,
        lang:               s.lang,
        walletAddress:      s.walletAddress,
        walletConnected:    s.walletConnected,
        displayName:        s.displayName,
        profilePhoto:       s.profilePhoto,
        safePin:            s.safePin,
        onboardingComplete: s.onboardingComplete,
        demoMode:           s.demoMode,
        // Local-only app data
        aiMessages:              s.aiMessages,
        notifications:           s.notifications,
        onboardingChecklistDone: s.onboardingChecklistDone,
        emergencyContact:        s.emergencyContact,
      }),
    }
  )
)
