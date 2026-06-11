import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  MOCK_PROFILES,
  MOCK_CAPSULES,
  MOCK_FILES,
  MOCK_MEMBERS,
  MOCK_TIMELINE,
  MOCK_LEGACY,
  MOCK_AI_MESSAGES,
} from '@/data/mockData'

// ── Tiny unique-id helper ────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

// ── Initial per-profile data seeded from mock data ───────────────────────────
const INITIAL_PROFILE_FILES = {
  p1: [...MOCK_FILES],
  p2: [],
  p3: [],
}
const INITIAL_PROFILE_MEMBERS = {
  p1: [...MOCK_MEMBERS],
  p2: [],
  p3: [],
}
const INITIAL_PROFILE_TIMELINE = {
  p1: [...MOCK_TIMELINE],
  p2: [],
  p3: [],
}

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

      // ── Active profile (navigation context) ──────────────────────────────────
      activeProfile: null,
      setActiveProfile: (p) => set({ activeProfile: p }),

      // ── Vault unlock (session-only, not persisted) ────────────────────────────
      safeUnlocked: false,
      setSafeUnlocked: (v) => set({ safeUnlocked: v }),

      // ── Notifications ─────────────────────────────────────────────────────────
      notifications: [],

      // ════════════════════════════════════════════════════════════════════════
      // PROFILES (circles)
      // ════════════════════════════════════════════════════════════════════════
      profiles: [...MOCK_PROFILES],

      addProfile: (data) => {
        const { walletAddress, displayName, profiles, profileFiles, profileMembers, profileTimeline } = get()
        const id = uid()
        const adminMember = {
          address: walletAddress || '0xDEMO',
          short:   walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '0xDEMO',
          name:    displayName || 'You',
          role:    'Admin',
          joinDate: new Date().toISOString(),
          verified: false,
        }
        const newProfile = {
          id,
          name:         data.name,
          type:         data.type || 'Custom',
          description:  data.description || `A new ${data.type || 'custom'} circle.`,
          members:      [adminMember],
          fileCount:    0,
          memoryCount:  0,
          lastActivity: new Date().toISOString(),
          createdAt:    new Date().toISOString(),
        }
        set({
          profiles:        [...profiles, newProfile],
          profileFiles:    { ...profileFiles,    [id]: [] },
          profileMembers:  { ...profileMembers,  [id]: [adminMember] },
          profileTimeline: { ...profileTimeline, [id]: [] },
        })
        get().addNotification({ icon: '👥', title: 'Circle created', body: `"${data.name}" is now live.` })
        return newProfile
      },

      updateProfile: (id, updates) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deleteProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),

      joinProfile: (code) => {
        const { walletAddress, displayName, profiles, profileFiles, profileMembers, profileTimeline } = get()
        const id = uid()
        const member = {
          address: walletAddress || '0xDEMO',
          short:   walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '0xDEMO',
          name:    displayName || 'You',
          role:    'Member',
          joinDate: new Date().toISOString(),
          verified: false,
        }
        const joined = {
          id,
          name:         `Circle ${code.slice(-4).toUpperCase()}`,
          type:         'Custom',
          description:  'Joined via invite code.',
          members:      [member],
          fileCount:    0,
          memoryCount:  0,
          lastActivity: new Date().toISOString(),
          createdAt:    new Date().toISOString(),
        }
        set({
          profiles:        [...profiles, joined],
          profileFiles:    { ...profileFiles,    [id]: [] },
          profileMembers:  { ...profileMembers,  [id]: [member] },
          profileTimeline: { ...profileTimeline, [id]: [] },
        })
        return joined
      },

      // ════════════════════════════════════════════════════════════════════════
      // MEMORY CAPSULES
      // ════════════════════════════════════════════════════════════════════════
      capsules: [...MOCK_CAPSULES],

      addCapsule: (data) => {
        const { capsules } = get()
        const newCapsule = {
          id:             uid(),
          title:          data.title,
          type:           data.type || 'Private',
          contentPreview: data.description || 'A new memory capsule.',
          photos:         0,
          voice:          0,
          letters:        0,
          date:           new Date().toISOString(),
          unlockDate:     data.unlockDate || null,
          coverColor:     'linear-gradient(135deg, #051F20, #0B2B26)',
          profileId:      data.profileId || null,
        }
        set({ capsules: [newCapsule, ...capsules] })
        get().addNotification({ icon: '🌸', title: 'Capsule created', body: `"${data.title}" added to your vault.` })
        return newCapsule
      },

      updateCapsule: (id, updates) =>
        set((s) => ({
          capsules: s.capsules.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCapsule: (id) =>
        set((s) => ({ capsules: s.capsules.filter((c) => c.id !== id) })),

      // ── Reactions ────────────────────────────────────────────────────────────
      // Shape: { [capsuleId]: { '🕯️': n, '❤️': n, '🌸': n, userReacted: [emoji,...] } }
      reactions: {},

      addReaction: (capsuleId, emoji) => {
        const { reactions } = get()
        const existing     = reactions[capsuleId] || {}
        const userReacted  = existing.userReacted  || []
        if (userReacted.includes(emoji)) {
          // Toggle off
          set({
            reactions: {
              ...reactions,
              [capsuleId]: {
                ...existing,
                [emoji]:     Math.max(0, (existing[emoji] || 0) - 1),
                userReacted: userReacted.filter((r) => r !== emoji),
              },
            },
          })
          return false
        }
        // Toggle on
        set({
          reactions: {
            ...reactions,
            [capsuleId]: {
              ...existing,
              [emoji]:     (existing[emoji] || 0) + 1,
              userReacted: [...userReacted, emoji],
            },
          },
        })
        return true
      },

      // ════════════════════════════════════════════════════════════════════════
      // LEGACY SETTINGS
      // ════════════════════════════════════════════════════════════════════════
      legacySettings: { ...MOCK_LEGACY },

      updateLegacySettings: (updates) =>
        set((s) => ({ legacySettings: { ...s.legacySettings, ...updates } })),

      pingAlive: () => {
        const now  = new Date()
        const next = new Date(now)
        next.setMonth(next.getMonth() + 1)
        set((s) => ({
          legacySettings: {
            ...s.legacySettings,
            lastPing: now.toISOString(),
            nextPing: next.toISOString(),
          },
        }))
        get().addNotification({ icon: '💓', title: 'Alive ping recorded', body: 'On-chain clock reset. See you next month.' })
      },

      // ── Emergency contact ─────────────────────────────────────────────────────
      emergencyContact: null,
      setEmergencyContact: (contact) => set({ emergencyContact: contact }),

      // ════════════════════════════════════════════════════════════════════════
      // PRIVATE SAFE DATA
      // (text/metadata only — no binary blobs in localStorage)
      // ════════════════════════════════════════════════════════════════════════
      safeData: {
        cryptoKeys: [],   // [{ id, label, value }]
        letters:    [],   // [{ id, content, savedAt }]
        voiceNotes: [],   // [{ id, name, duration, date }]
        passwords:  [{ id: 'pw0', label: 'Gmail', username: '', password: '' }],
        documents:  [],   // [{ id, name, size, type, date, nftId }]
        photos:     [],   // [{ id, name, date }]
      },

      updateSafeSection: (section, data) =>
        set((s) => ({ safeData: { ...s.safeData, [section]: data } })),

      // ════════════════════════════════════════════════════════════════════════
      // PER-PROFILE FILES
      // ════════════════════════════════════════════════════════════════════════
      profileFiles: { ...INITIAL_PROFILE_FILES },

      addProfileFile: (profileId, file) => {
        const { profileFiles, profiles, displayName } = get()
        const existing = profileFiles[profileId] || []
        const nftNum   = Math.floor(Math.random() * 9000) + 1000
        const newFile  = {
          id:       uid(),
          name:     file.name,
          size:     file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown',
          type:     file.name.split('.').pop()?.toLowerCase() || 'file',
          date:     new Date().toISOString(),
          nftId:    `#${nftNum}`,
          cid:      `bafybei${Math.random().toString(36).slice(2, 40)}`,
          uploader: displayName || 'You',
        }
        set({
          profileFiles: { ...profileFiles, [profileId]: [...existing, newFile] },
          profiles: profiles.map((p) =>
            p.id === profileId ? { ...p, fileCount: (p.fileCount || 0) + 1 } : p
          ),
        })
        get().addNotification({ icon: '📎', title: 'File uploaded', body: `"${file.name}" minted to IPFS.` })
        return newFile
      },

      deleteProfileFile: (profileId, fileId) => {
        const { profileFiles, profiles } = get()
        const updated = (profileFiles[profileId] || []).filter((f) => f.id !== fileId)
        set({
          profileFiles: { ...profileFiles, [profileId]: updated },
          profiles: profiles.map((p) =>
            p.id === profileId ? { ...p, fileCount: Math.max(0, (p.fileCount || 0) - 1) } : p
          ),
        })
      },

      // ════════════════════════════════════════════════════════════════════════
      // PER-PROFILE MEMBERS
      // ════════════════════════════════════════════════════════════════════════
      profileMembers: { ...INITIAL_PROFILE_MEMBERS },

      addProfileMember: (profileId, memberData) => {
        const { profileMembers, profiles } = get()
        const existing  = profileMembers[profileId] || []
        const newMember = {
          address:  memberData.address || uid(),
          short:    memberData.address
            ? `${memberData.address.slice(0, 6)}…${memberData.address.slice(-4)}`
            : '0x????',
          name:     memberData.name || 'New Member',
          role:     memberData.role || 'Member',
          joinDate: new Date().toISOString(),
          verified: false,
          avatar:   null,
        }
        set({
          profileMembers: { ...profileMembers, [profileId]: [...existing, newMember] },
          profiles: profiles.map((p) =>
            p.id === profileId
              ? { ...p, members: [...(p.members || []), newMember] }
              : p
          ),
        })
        get().addNotification({ icon: '👤', title: 'Member added', body: `${newMember.name} joined a circle.` })
        return newMember
      },

      // ════════════════════════════════════════════════════════════════════════
      // PER-PROFILE TIMELINE
      // ════════════════════════════════════════════════════════════════════════
      profileTimeline: { ...INITIAL_PROFILE_TIMELINE },

      addTimelineEvent: (profileId, event) => {
        const { profileTimeline, displayName } = get()
        const existing = profileTimeline[profileId] || []
        const newEvent = {
          id:          uid(),
          icon:        event.icon || '📌',
          wallet:      event.wallet || displayName || 'You',
          description: event.description || '',
          timestamp:   new Date().toISOString(),
        }
        set({
          profileTimeline: {
            ...profileTimeline,
            [profileId]: [newEvent, ...existing],
          },
        })
        return newEvent
      },

      // ════════════════════════════════════════════════════════════════════════
      // AI MESSAGES
      // ════════════════════════════════════════════════════════════════════════
      aiMessages: [...MOCK_AI_MESSAGES],

      addAiMessage: (msg) =>
        set((s) => ({ aiMessages: [...s.aiMessages, msg] })),

      clearAiMessages: () =>
        set({ aiMessages: [...MOCK_AI_MESSAGES] }),

      // ════════════════════════════════════════════════════════════════════════
      // NOTIFICATIONS
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
      // CAPSULE CONTENT  (per-capsule photos / letters / voice)
      // ════════════════════════════════════════════════════════════════════════
      capsuleContent: {},   // { [capsuleId]: { photos:[], letters:[], voice:[] } }

      addCapsuleContent: (capsuleId, type, item) =>
        set((s) => {
          const cur = s.capsuleContent[capsuleId] || { photos: [], letters: [], voice: [] }
          const upd = { ...cur, [type]: [...(cur[type] || []), item] }
          return {
            capsuleContent: { ...s.capsuleContent, [capsuleId]: upd },
            capsules: s.capsules.map((c) =>
              c.id === capsuleId ? { ...c, [type]: upd[type].length } : c
            ),
          }
        }),

      removeCapsuleContent: (capsuleId, type, itemId) =>
        set((s) => {
          const cur = s.capsuleContent[capsuleId] || { photos: [], letters: [], voice: [] }
          const upd = { ...cur, [type]: (cur[type] || []).filter((i) => i.id !== itemId) }
          return {
            capsuleContent: { ...s.capsuleContent, [capsuleId]: upd },
            capsules: s.capsules.map((c) =>
              c.id === capsuleId ? { ...c, [type]: upd[type].length } : c
            ),
          }
        }),

      // ════════════════════════════════════════════════════════════════════════
      // ISSUED CREDENTIALS  (Organizations page)
      // ════════════════════════════════════════════════════════════════════════
      issuedCredentials: [],

      addCredential: (data) =>
        set((s) => {
          const cred = {
            id:       uid(),
            ...data,
            nftId:    `#${data.prefix || 'CRED'}-${Math.floor(Math.random() * 90000) + 10000}`,
            issuedAt: new Date().toISOString(),
            verified: true,
          }
          return { issuedCredentials: [cred, ...s.issuedCredentials] }
        }),

      removeCredential: (id) =>
        set((s) => ({ issuedCredentials: s.issuedCredentials.filter((c) => c.id !== id) })),

      // ════════════════════════════════════════════════════════════════════════
      // DATA MANAGEMENT
      // ════════════════════════════════════════════════════════════════════════

      // Import vault from JSON backup
      importVault: (data) => {
        const allowed = [
          'displayName', 'profilePhoto', 'safePin', 'onboardingComplete', 'demoMode',
          'theme', 'lang', 'profiles', 'capsules', 'reactions', 'legacySettings',
          'safeData', 'profileFiles', 'profileMembers', 'profileTimeline', 'aiMessages',
          'notifications', 'capsuleContent', 'issuedCredentials', 'emergencyContact',
        ]
        const imported = {}
        allowed.forEach(k => { if (data[k] !== undefined) imported[k] = data[k] })
        set(imported)
      },

      // Remove only the seed/mock data (ids p1/p2/p3 and c1/c2/c3/c4)
      clearDemoData: () => {
        const DEMO_PROFILE_IDS = ['p1', 'p2', 'p3']
        const DEMO_CAPSULE_IDS = ['c1', 'c2', 'c3', 'c4']
        set((s) => ({
          profiles: s.profiles.filter((p) => !DEMO_PROFILE_IDS.includes(p.id)),
          capsules: s.capsules.filter((c) => !DEMO_CAPSULE_IDS.includes(c.id)),
          profileFiles:    Object.fromEntries(
            Object.entries(s.profileFiles || {}).filter(([k]) => !DEMO_PROFILE_IDS.includes(k))
          ),
          profileMembers:  Object.fromEntries(
            Object.entries(s.profileMembers || {}).filter(([k]) => !DEMO_PROFILE_IDS.includes(k))
          ),
          profileTimeline: Object.fromEntries(
            Object.entries(s.profileTimeline || {}).filter(([k]) => !DEMO_PROFILE_IDS.includes(k))
          ),
          reactions: Object.fromEntries(
            Object.entries(s.reactions || {}).filter(([k]) => !DEMO_CAPSULE_IDS.includes(k))
          ),
        }))
      },

      // Wipe everything — full factory reset
      resetAll: () => {
        set({
          walletAddress: null, walletConnected: false,
          displayName: null, profilePhoto: null, safePin: null,
          onboardingComplete: false, demoMode: false,
          activeProfile: null, safeUnlocked: false,
          profiles:        [...MOCK_PROFILES],
          capsules:        [...MOCK_CAPSULES],
          reactions:       {},
          legacySettings:  { ...MOCK_LEGACY },
          safeData: {
            cryptoKeys: [], letters: [], voiceNotes: [],
            passwords:  [{ id: 'pw0', label: '', username: '', password: '' }],
            documents:  [], photos:   [],
          },
          profileFiles:       { ...INITIAL_PROFILE_FILES },
          profileMembers:     { ...INITIAL_PROFILE_MEMBERS },
          profileTimeline:    { ...INITIAL_PROFILE_TIMELINE },
          aiMessages:         [...MOCK_AI_MESSAGES],
          notifications:         [],
          capsuleContent:        {},
          issuedCredentials:     [],
          onboardingChecklistDone: false,
          emergencyContact:      null,
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
        // App data
        profiles:           s.profiles,
        capsules:           s.capsules,
        reactions:          s.reactions,
        legacySettings:     s.legacySettings,
        safeData:           s.safeData,
        profileFiles:       s.profileFiles,
        profileMembers:     s.profileMembers,
        profileTimeline:    s.profileTimeline,
        aiMessages:         s.aiMessages,
        notifications:           s.notifications,
        capsuleContent:          s.capsuleContent,
        issuedCredentials:       s.issuedCredentials,
        onboardingChecklistDone: s.onboardingChecklistDone,
        emergencyContact:        s.emergencyContact,
      }),
    }
  )
)
