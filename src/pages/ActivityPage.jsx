import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { formatDistanceToNow, format } from 'date-fns'
import FlowingCanvas from '@/components/ui/FlowingCanvas'

const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'circle', label: 'Circles' },
  { key: 'system', label: 'System' },
]

export default function ActivityPage() {
  const { profileTimeline, profiles, notifications } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const allEvents = useMemo(() => {
    const events = []

    Object.entries(profileTimeline || {}).forEach(([profileId, timeline]) => {
      const profile = profiles.find(p => p.id === profileId)
      ;(timeline || []).forEach(event => {
        events.push({
          ...event,
          source:      'circle',
          profileName: profile?.name || 'Unknown Circle',
        })
      })
    })

    ;(notifications || []).forEach(n => {
      events.push({
        id:          n.id,
        icon:        n.icon,
        wallet:      n.title,
        description: n.body,
        timestamp:   n.time,
        source:      'system',
        profileName: null,
      })
    })

    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [profileTimeline, notifications])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? allEvents : allEvents.filter(e => e.source === filter)
    if (search.trim().length >= 2) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.wallet?.toLowerCase().includes(q) ||
        e.profileName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allEvents, filter, search])

  const counts = useMemo(() => ({
    all:    allEvents.length,
    circle: allEvents.filter(e => e.source === 'circle').length,
    system: allEvents.filter(e => e.source === 'system').length,
  }), [allEvents])

  // Group by date
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(e => {
      const dateKey = format(new Date(e.timestamp), 'dd MMM yyyy')
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(e)
    })
    return Object.entries(groups)
  }, [filtered])

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
              Vault timeline
            </span>
          </div>
          <h1 className="font-sora font-bold text-3xl shimmer-text mb-2">Activity</h1>
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            A complete record of everything that happened in your vault.
          </p>
        </motion.div>

        {/* Search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-3"
        >
          <input
            className="vault-input text-sm"
            placeholder="Search activity…"
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
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        {grouped.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <span className="text-4xl block mb-3">📭</span>
            <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.5)' }}>
              {search.length >= 2 ? `No results for "${search}"` : 'No activity yet. Start using your vault.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dateKey, events], gi) => (
              <div key={dateKey}>
                {/* Date divider */}
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
                      key={event.id || `${gi}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card p-4 flex items-start gap-4"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: event.source === 'system' ? 'rgba(142,182,155,0.08)' : 'rgba(11,43,38,0.5)' }}
                      >
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            {event.profileName && (
                              <span className="badge-cobalt text-xs mb-1 inline-block">{event.profileName}</span>
                            )}
                            <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>
                              {event.source === 'circle' && (
                                <span style={{ color: '#8EB69B' }}>{event.wallet} </span>
                              )}
                              {event.description}
                            </p>
                            {event.source === 'system' && (
                              <p className="font-sora font-semibold text-xs mt-0.5" style={{ color: '#8EB69B' }}>{event.wallet}</p>
                            )}
                          </div>
                          <p className="font-inter text-xs flex-shrink-0" style={{ color: 'rgba(142,182,155,0.4)' }}>
                            {format(new Date(event.timestamp), 'HH:mm')}
                          </p>
                        </div>
                        <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.3)' }}>
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more hint */}
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
