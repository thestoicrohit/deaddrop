// Static, local-only sample content shown when no wallet is connected, so a
// first-time visitor can click through every screen before deciding to
// connect. None of this is real, none of it is ever written anywhere —
// it exists purely so the app isn't a wall of "connect your wallet" prompts.
// Every write action (create, upload, deposit, save) still requires a real
// connected wallet — see the `demo` guards next to each handler.

export const DEMO_CIRCLES = [
  {
    id: 'demo-1',
    name: 'The Family',
    description: 'Photos, letters and the things we want the kids to have one day.',
    circleType: 0, // Family
    memberCount: 4,
    fileCount: 12,
  },
  {
    id: 'demo-2',
    name: 'College Crew',
    description: 'Every ridiculous photo from four years we refuse to lose.',
    circleType: 2, // University
    memberCount: 6,
    fileCount: 31,
  },
]

export const DEMO_CAPSULE_TYPE = { LETTER: 0, PHOTO: 1, VOICE: 2, VIDEO: 3 }

export const DEMO_CAPSULES = [
  { id: 'demo-c1', title: 'For my daughter, on her 18th', capsuleType: DEMO_CAPSULE_TYPE.LETTER, circleId: 'demo-1', preview: 'A letter I want her to read the day she leaves for college.' },
  { id: 'demo-c2', title: 'Diwali 2025', capsuleType: DEMO_CAPSULE_TYPE.PHOTO, circleId: 'demo-1', preview: '18 photos' },
  { id: 'demo-c3', title: 'Dad\'s voice, reading a bedtime story', capsuleType: DEMO_CAPSULE_TYPE.VOICE, circleId: 'demo-1', preview: '4:12' },
  { id: 'demo-c4', title: 'Graduation day', capsuleType: DEMO_CAPSULE_TYPE.PHOTO, circleId: 'demo-2', preview: '9 photos' },
]

export const DEMO_SAFE_SECTIONS = {
  keys:      [{ label: 'Hardware wallet seed phrase', hint: '24 words · stored encrypted' }],
  docs:      [{ label: 'Will (PDF)', hint: 'Notarized, 2024' }],
  letters:   [{ label: 'To my brother', hint: 'Sealed until claimed' }],
  voice:     [{ label: 'A message for mom', hint: '2:03' }],
  photos:    [{ label: 'Passport & ID scans', hint: '3 images' }],
  passwords: [{ label: 'Email recovery codes', hint: 'Encrypted' }],
}

export const DEMO_ACTIVITY = [
  { id: 'demo-a1', text: 'Vault created', when: '2 days ago' },
  { id: 'demo-a2', text: 'Beneficiary added', when: '2 days ago' },
  { id: 'demo-a3', text: 'Ping — still here', when: '1 day ago' },
]

// Shown next to every disabled action while browsing without a wallet.
export const DEMO_NOTICE = "You're viewing sample data. Connect a wallet to create and store your own — it's free."
