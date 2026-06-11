// Mock data for demo mode and development

export const MOCK_WALLET = '0x3f7a9b2d4e1c8f5a6b0d9e2c7f4a1b8e5c2d9f6a'

export const MOCK_PROFILES = [
  {
    id: 'p1',
    name: 'Sharma Family',
    type: 'Family',
    members: [
      { address: '0x3f7a...a91c', avatar: null, name: 'Rohit Sharma', role: 'admin' },
      { address: '0x8c2d...f3a1', avatar: null, name: 'Priya Sharma', role: 'member' },
      { address: '0x1e9f...b7c4', avatar: null, name: 'Arjun Sharma', role: 'member' },
    ],
    lastActivity: '2026-06-05T10:30:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    description: 'Our family memories, documents, and legacy.',
    fileCount: 47,
    memoryCount: 23,
    color: '#FECD6D',
  },
  {
    id: 'p2',
    name: 'College Squad — IIT Delhi',
    type: 'University',
    members: [
      { address: '0x3f7a...a91c', avatar: null, name: 'Rohit Sharma', role: 'admin' },
      { address: '0x5b1e...c8d2', avatar: null, name: 'Kavya Nair', role: 'member' },
      { address: '0x9a3c...e5f0', avatar: null, name: 'Vikram Singh', role: 'member' },
      { address: '0x2d7f...1a9e', avatar: null, name: 'Ananya Roy', role: 'member' },
    ],
    lastActivity: '2026-06-03T14:00:00Z',
    createdAt: '2023-07-20T00:00:00Z',
    description: 'Four years of chaos, coffee, and code.',
    fileCount: 89,
    memoryCount: 62,
    color: '#5686BB',
  },
  {
    id: 'p3',
    name: 'Founding Team — NovaPay',
    type: 'Work',
    members: [
      { address: '0x3f7a...a91c', avatar: null, name: 'Rohit Sharma', role: 'member' },
      { address: '0x7e4a...2b6c', avatar: null, name: 'Aditya Kapoor', role: 'admin' },
    ],
    lastActivity: '2026-05-28T09:15:00Z',
    createdAt: '2024-08-01T00:00:00Z',
    description: 'Equity docs, offer letters, and founding story.',
    fileCount: 15,
    memoryCount: 8,
    color: '#D1601F',
  },
]

export const MOCK_CAPSULES = [
  {
    id: 'c1',
    title: 'Letters to My Children',
    type: 'Legacy',
    coverColor: '#70191D',
    date: '2026-01-01',
    contentPreview: 'A collection of letters written across three years — one for each milestone I might miss.',
    photos: 3,
    voice: 2,
    letters: 5,
    locked: false,
    unlockDate: null,
    profileId: null,
  },
  {
    id: 'c2',
    title: 'Mumbai 2019 — The Year Everything Changed',
    type: 'Private',
    coverColor: '#1a0810',
    date: '2019-12-31',
    contentPreview: 'The train rides, the monsoon, the rooftop nights. These belong only to me.',
    photos: 47,
    voice: 8,
    letters: 1,
    locked: true,
    unlockDate: null,
    profileId: null,
  },
  {
    id: 'c3',
    title: 'Family Reunion — Shimla 2025',
    type: 'Shared',
    coverColor: '#0a1525',
    date: '2025-12-25',
    contentPreview: 'First time all four cousins in the same room in nine years.',
    photos: 134,
    voice: 0,
    letters: 0,
    locked: false,
    unlockDate: null,
    profileId: 'p1',
  },
  {
    id: 'c4',
    title: 'Open When You Miss Me',
    type: 'Time-locked',
    coverColor: '#1a0d00',
    date: '2026-06-06',
    contentPreview: 'This capsule opens on 15 August 2030. A letter to myself — and to whoever reads this after.',
    photos: 1,
    voice: 1,
    letters: 3,
    locked: true,
    unlockDate: '2030-08-15T00:00:00Z',
    profileId: null,
  },
]

export const MOCK_FILES = [
  {
    id: 'f1',
    name: 'Property_Deed_Mumbai_2021.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploader: '0x3f7a...a91c',
    date: '2026-05-10T00:00:00Z',
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    nftId: '#0041',
  },
  {
    id: 'f2',
    name: 'PAN_Card_Rohit.jpg',
    type: 'image',
    size: '340 KB',
    uploader: '0x3f7a...a91c',
    date: '2026-04-22T00:00:00Z',
    cid: 'bafybeibwzifw52ttrkqlikfzext6rjfe4zuh6i25hmjsyofftkytnpdlku',
    nftId: '#0039',
  },
  {
    id: 'f3',
    name: 'Will_and_Testament_Draft.pdf',
    type: 'pdf',
    size: '1.1 MB',
    uploader: '0x8c2d...f3a1',
    date: '2026-02-14T00:00:00Z',
    cid: 'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
    nftId: '#0027',
  },
]

export const MOCK_MEMBERS = [
  {
    address: '0x3f7a9b2d4e1c8f5a6b0d9e2c7f4a1b8e5c2d9f6a',
    short: '0x3f7a...9f6a',
    name: 'Rohit Sharma',
    avatar: null,
    role: 'Admin',
    joinDate: '2024-01-15T00:00:00Z',
    verified: true,
  },
  {
    address: '0x8c2df1a3b9e4c7d2f5a8b0e1c4d7f9a2b5e8c1d4',
    short: '0x8c2d...c1d4',
    name: 'Priya Sharma',
    avatar: null,
    role: 'Member',
    joinDate: '2024-01-16T00:00:00Z',
    verified: true,
  },
  {
    address: '0x1e9fa2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3',
    short: '0x1e9f...e0f3',
    name: 'Arjun Sharma',
    avatar: null,
    role: 'Member',
    joinDate: '2024-03-20T00:00:00Z',
    verified: true,
  },
]

export const MOCK_TIMELINE = [
  {
    id: 't1',
    type: 'file_uploaded',
    description: 'uploaded Property_Deed_Mumbai_2021.pdf',
    wallet: '0x3f7a...9f6a',
    timestamp: '2026-05-10T10:30:00Z',
    icon: '📄',
  },
  {
    id: 't2',
    type: 'memory_added',
    description: 'added a memory to Shimla 2025',
    wallet: '0x8c2d...c1d4',
    timestamp: '2026-05-08T16:45:00Z',
    icon: '🌸',
  },
  {
    id: 't3',
    type: 'member_joined',
    description: 'Arjun Sharma joined the circle',
    wallet: '0x1e9f...e0f3',
    timestamp: '2024-03-20T09:00:00Z',
    icon: '👤',
  },
  {
    id: 't4',
    type: 'milestone',
    description: 'Family circle created',
    wallet: '0x3f7a...9f6a',
    timestamp: '2024-01-15T00:00:00Z',
    icon: '🏛️',
  },
]

export const MOCK_LEGACY = {
  inactivityThreshold: '6months',
  lastPing: '2026-06-01T00:00:00Z',
  nextPing: '2026-07-01T00:00:00Z',
  gracePeriod: 30,
  multiSig: false,
  chainlinkActive: true,
  beneficiaries: [
    { asset: 'All IPFS Files', wallet: '0x8c2d...c1d4', name: 'Priya Sharma', percentage: 60 },
    { asset: 'All IPFS Files', wallet: '0x1e9f...e0f3', name: 'Arjun Sharma', percentage: 40 },
  ],
  finalMessage: '',
}

export const MOCK_AI_MESSAGES = [
  {
    role: 'assistant',
    content: "Hello. I'm watching over your vault. What would you like to explore today?",
    timestamp: new Date().toISOString(),
  },
]

export const STATS_COUNTERS = [
  { value: 50000000000, label: 'Unclaimed Crypto', prefix: '$', suffix: '+', display: '$50B+' },
  { value: 2000000000, label: 'Photos Deleted Yearly', prefix: '', suffix: '+', display: '2B+' },
  { value: 400000000, label: 'Unbanked Indians', prefix: '', suffix: '+', display: '400M+' },
]

export const STORAGE_TYPES = [
  { icon: '📸', label: 'Photos & Videos' },
  { icon: '🎙️', label: 'Voice Notes' },
  { icon: '💌', label: 'Letters' },
  { icon: '₿', label: 'Crypto Keys' },
  { icon: '📄', label: 'Documents' },
  { icon: '🎵', label: 'Playlists' },
  { icon: '🖼️', label: 'Art & NFTs' },
  { icon: '🔐', label: 'Passwords' },
]
