import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import FlowingCanvas from '@/components/ui/FlowingCanvas'
import { useActivity, describeActivity } from '@/hooks/useActivity'

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'vault',       label: 'Vault' },
  { key: 'circles',     label: 'Circles' },
  { key: 'capsules',    label: 'Capsules' },
  { key: 'safe',        label: 'Safe' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'keyRegistry', label: 'Keys' },
]

const DOMAIN_ICON = {
  vault:       '🏛️',
  keyRegistry: '🔑',
  circles:     '🌐',
  capsules:    '🌸',
  safe:        '🔒',
  credentials: '🎖️',
}

export default function ActivityPage() {
  const { activity, isLoading, domainsReady } = useActivity()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = filter === 'all' ? activity : activity.filter(e => e.domain === filter)
    if (search.trim().length >= 2) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        describeActivity(e).toLowerCase().includes(q) ||
        e.eventName?.toLowerCase().includes(q) ||
        e.domainLabel?.toLowerCase().includes(q) ||
        e.transactionHash?.toLowerCase().includes(q)
      )
    }
    return list
  }, [activity, filter, search])

  const counts = useMemo(() => {
    const c = { all: activity.length }
    FILTERS.slice(1).forEach(f => {
      c[f.key] = activity.filter(e => e.domain === f.key).length
    })
    return c
  }, [activity])

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(e => {
      const ts = e.timestamp ? new Date(Number(e.timestamp) * 1000) : null
      const dateKey = ts ? format(ts, 'dd MMM yyyy') : 'Pending'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push({ ...e, _ts: ts })
    })
    return Object.entries(groups)
  }, [filtered])

  const noContracts = domainsReady.length === 0

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>
      <FlowingCanvas />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#8EB69B' }} />
            <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>
              On-chain event feed
            </span>
          </div>
          <h1 className="font-sora font-bold text-3xl shimmer-text mb-2">Activity</h1>
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            Live contract events across all DeadDrop domains.
          </p>
        </motion.div>

        {noContracts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-6 mb-6 text-center"
          >
            <p className="font-inter text-sm" style={{ color: '#D1601F' }}>
              ⚠ No contracts deployed yet. Run <code className="font-mono">npm run deploy:sepolia</code> then set the contract addresses in your <code className="font-mono">.env</code>.
            </p>
          </motion.div>
        )}

        {/* Search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-3"
        >
          <input
            className="vault-input text-sm"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 rounded-full font-sora text-sm transition-all"
                style={{
                  background:   filter === f.key ? '#163832' : 'rgba(11,43,38,0.3)',
                  color:        filter === f.key ? '#DAF1DE' : '#8EB69B',
                  border:       `1px solid ${filter === f.key ? 'rgba(218,241,222,0.3)' : 'rgba(142,182,155,0.15)'}`,
                }}
              >
                {f.label}
                <span className="ml-1.5 text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 border-t-transparent"
              style={{ borderColor: '#8EB69B', borderTopColor: 'transparent' }}
            />
            <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>Fetching on-chain events…</p>
          </motion.div>
        ) : grouped.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <span className="text-4xl block mb-3">📭</span>
            <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.5)' }}>
              {search.length >= 2 ? `No results for "${search}"` : 'No on-chain events yet.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dateKey, events], gi) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: 'rgba(142,182,155,0.1)' }} />
                  <span className="font-inter text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(11,43,38,0.4)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.15)' }}>
                    {dateKey}
                  </span>
                  <div className="h-px flex-1" style={{ background: 'rgba(142,182,155,0.1)' }} />
                </div>

                <div className="space-y-2">
                  {events.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card p-4 flex items-start gap-4"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: 'rgba(11,43,38,0.5)' }}
                      >
                        {DOMAIN_ICON[event.domain] || '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <span className="badge-cobalt text-xs mb-1 inline-block">{event.domainLabel}</span>
                            <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>
                              {describeActivity(event)}
                            </p>
                            <p className="font-inter text-xs mt-0.5 font-mono truncate" style={{ color: 'rgba(142,182,155,0.4)' }}>
                              {event.transactionHash
                                ? <a
                                    href={`https://sepolia.etherscan.io/tx/${event.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-green-300"
                                  >
                                    {event.transactionHash.slice(0, 12)}…
                                  </a>
                                : null}
                            </p>
                          </div>
                          {event._ts && (
                            <p className="font-inter text-xs flex-shrink-0" style={{ color: 'rgba(142,182,155,0.4)' }}>
                              {format(event._ts, 'HH:mm')}
                            </p>
                          )}
                        </div>
                        {event._ts && (
                          <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.3)' }}>
                            {formatDistanceToNow(event._ts, { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center font-inter text-xs mt-8"
            style={{ color: 'rgba(142,182,155,0.3)' }}
          >
            {filtered.length} event{filtered.length !== 1 ? 's' : ''} total
          </motion.p>
        )}
      </div>
    </div>
  )
}
