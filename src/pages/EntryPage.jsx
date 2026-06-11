import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LangToggle from '@/components/ui/LangToggle'

/* ─────────────────────────────────────────────────────────────
   NEURAL ORB — 3D rotating particle sphere + rings + sparks
   Forest green palette: #051F20 → #DAF1DE
───────────────────────────────────────────────────────────── */
function NeuralOrb({ mouseX, mouseY }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const cx = W / 2
    const cy = H / 2
    const R = Math.min(W, H) * 0.36

    // ── Fibonacci sphere — forest green family ──
    const N = 280
    const PHI = (1 + Math.sqrt(5)) / 2
    // Sage, mint-mist, mid-forest, dark-moss, sage again
    const COLORS = ['142,182,155', '218,241,222', '35,83,71', '11,43,38', '142,182,155']

    const particles = Array.from({ length: N }, (_, i) => {
      const t2 = i / (N - 1)
      const polar = Math.acos(1 - 2 * t2)
      const azim = 2 * Math.PI * i / PHI
      const jitter = 0.82 + Math.random() * 0.36
      return {
        sx: Math.sin(polar) * Math.cos(azim),
        sy: Math.sin(polar) * Math.sin(azim),
        sz: Math.cos(polar),
        r: R * jitter,
        ph: Math.random() * Math.PI * 2,
        sp: 0.12 + Math.random() * 0.28,
        rgb: COLORS[Math.floor(Math.random() * COLORS.length)],
        baseAlpha: 0.5 + Math.random() * 0.5,
        size: 0.9 + Math.random() * 1.9,
        bright: Math.random() < 0.1,
      }
    })

    // ── Inner core particles ──
    const inner = Array.from({ length: 60 }, () => {
      const phi2 = Math.random() * Math.PI
      const theta2 = Math.random() * 2 * Math.PI
      const r2 = R * (0.15 + Math.random() * 0.55)
      return {
        sx: Math.sin(phi2) * Math.cos(theta2),
        sy: Math.sin(phi2) * Math.sin(theta2),
        sz: Math.cos(phi2),
        r: r2,
        ph: Math.random() * Math.PI * 2,
        sp: 0.08 + Math.random() * 0.18,
        rgb: '35,83,71',
        baseAlpha: 0.14 + Math.random() * 0.2,
        size: 0.4 + Math.random() * 0.7,
        bright: false,
        inner: true,
      }
    })

    const allPts = [...particles, ...inner]
    const projected = new Array(allPts.length)

    // ── Orbital rings — green family ──
    const rings = [
      { tilt: 18, speed: 0.009,  radius: R * 1.18, rgb: '142,182,155', alpha: 0.5,  w: 1.1 },
      { tilt: 72, speed: -0.006, radius: R * 1.06, rgb: '218,241,222', alpha: 0.35, w: 0.8 },
      { tilt: 45, speed: 0.014,  radius: R * 0.93, rgb: '35,83,71',   alpha: 0.4,  w: 0.7 },
    ]
    const ringAngles = rings.map(() => 0)

    // ── Synaptic sparks ──
    const sparks = []
    const addSpark = () => {
      if (sparks.length >= 12) return
      const i1 = Math.floor(Math.random() * N * 0.7)
      const i2 = Math.floor(Math.random() * N * 0.7)
      if (i1 !== i2) sparks.push({ i1, i2, t: 0, spd: 0.006 + Math.random() * 0.012 })
    }

    let time = 0
    let rotY = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)

      const mx = mouseX.get()
      const my = mouseY.get()
      rotY += 0.0025
      const tiltX = ((my / window.innerHeight) - 0.5) * 0.25
      const tiltY = rotY + ((mx / window.innerWidth) - 0.5) * 0.4

      const cosY = Math.cos(tiltY), sinY = Math.sin(tiltY)
      const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX)

      // Project all points
      allPts.forEach((p, idx) => {
        const pulse = 1 + Math.sin(time * p.sp + p.ph) * 0.025
        const r = p.r * pulse
        let x3 = p.sx * r, y3 = p.sy * r, z3 = p.sz * r

        const rx2 = x3 * cosY - z3 * sinY
        const rz2 = x3 * sinY + z3 * cosY
        const ry3 = y3 * cosX - rz2 * sinX
        const rz3 = y3 * sinX + rz2 * cosX

        const persp = 3 / (3 + rz3 / R)
        projected[idx] = {
          x: cx + rx2 * persp,
          y: cy - ry3 * persp,
          depth: (rz3 + R) / (2 * R),
        }
      })

      // ── Ambient glow — forest green ──
      const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5)
      amb.addColorStop(0, 'rgba(35,83,71,0.14)')
      amb.addColorStop(0.55, 'rgba(11,43,38,0.07)')
      amb.addColorStop(1, 'transparent')
      ctx.fillStyle = amb
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2)
      ctx.fill()

      // ── Orbital rings (projected 3D) ──
      rings.forEach((ring, ri) => {
        ringAngles[ri] += ring.speed
        const SEG = 100
        const tiltRad = ring.tilt * Math.PI / 180

        ctx.beginPath()
        for (let s = 0; s <= SEG; s++) {
          const a = (s / SEG) * Math.PI * 2 + ringAngles[ri]
          let rx3 = ring.radius * Math.cos(a)
          let ry3b = ring.radius * Math.sin(a) * Math.cos(tiltRad)
          let rz3b = ring.radius * Math.sin(a) * Math.sin(tiltRad)

          const rx4 = rx3 * cosY - rz3b * sinY
          const rz4 = rx3 * sinY + rz3b * cosY
          const ry4 = ry3b * cosX - rz4 * sinX
          const rz5 = ry3b * sinX + rz4 * cosX

          const persp2 = 3 / (3 + rz5 / R)
          const depth2 = (rz5 + R) / (2 * R)

          const sx4 = cx + rx4 * persp2
          const sy4 = cy - ry4 * persp2

          if (s === 0) ctx.moveTo(sx4, sy4)
          else ctx.lineTo(sx4, sy4)
        }
        ctx.strokeStyle = `rgba(${ring.rgb},${ring.alpha * 0.6})`
        ctx.lineWidth = ring.w
        ctx.stroke()
      })

      // ── Connection edges (3D) ──
      const CONN = R * 0.44
      const CONN2 = CONN * CONN
      for (let i = 0; i < particles.length; i++) {
        if (projected[i].depth < 0.2) continue
        for (let j = i + 1; j < particles.length; j++) {
          if (projected[j].depth < 0.2) continue
          const p1 = allPts[i], p2 = allPts[j]
          const dx3 = p1.sx * p1.r - p2.sx * p2.r
          const dy3 = p1.sy * p1.r - p2.sy * p2.r
          const dz3 = p1.sz * p1.r - p2.sz * p2.r
          const d2 = dx3 * dx3 + dy3 * dy3 + dz3 * dz3
          if (d2 < CONN2) {
            const d = Math.sqrt(d2)
            const avgDepth = (projected[i].depth + projected[j].depth) / 2
            const alpha = (1 - d / CONN) * avgDepth * 0.4
            ctx.beginPath()
            ctx.moveTo(projected[i].x, projected[i].y)
            ctx.lineTo(projected[j].x, projected[j].y)
            ctx.strokeStyle = `rgba(142,182,155,${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // ── Inner connections ──
      for (let i = N; i < allPts.length; i++) {
        for (let j = 0; j < N; j += 4) {
          const p1 = allPts[i], p2 = allPts[j]
          const dx3 = p1.sx * p1.r - p2.sx * p2.r
          const dy3 = p1.sy * p1.r - p2.sy * p2.r
          const dz3 = p1.sz * p1.r - p2.sz * p2.r
          const d2 = dx3 * dx3 + dy3 * dy3 + dz3 * dz3
          if (d2 < (R * 0.35) ** 2) {
            const alpha = (1 - Math.sqrt(d2) / (R * 0.35)) * 0.1
            ctx.beginPath()
            ctx.moveTo(projected[i].x, projected[i].y)
            ctx.lineTo(projected[j].x, projected[j].y)
            ctx.strokeStyle = `rgba(35,83,71,${alpha})`
            ctx.lineWidth = 0.3
            ctx.stroke()
          }
        }
      }

      // ── Nodes (painter's sort by depth) ──
      const order = projected.map((_, i) => i).sort((a, b) => projected[a].depth - projected[b].depth)
      order.forEach(idx => {
        const p = allPts[idx]
        const pr = projected[idx]
        const depthFade = 0.1 + pr.depth * 0.9
        const size = (p.bright ? 3.0 : p.inner ? 0.55 : 1.6) * (0.55 + pr.depth * 0.45)
        const alpha = p.baseAlpha * depthFade

        ctx.shadowBlur = p.bright ? 18 : pr.depth > 0.55 ? 8 : 0
        ctx.shadowColor = `rgba(${p.rgb},0.9)`

        ctx.beginPath()
        ctx.arc(pr.x, pr.y, Math.max(0.3, size), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.rgb},${alpha})`
        ctx.fill()

        if (p.bright && pr.depth > 0.5) {
          ctx.beginPath()
          ctx.arc(pr.x, pr.y, 1.1, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(218,241,222,${pr.depth * 0.92})`
          ctx.fill()
        }
      })
      ctx.shadowBlur = 0

      // ── Synaptic sparks — mint glow ──
      if (Math.random() < 0.028) addSpark()
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.t += s.spd
        if (s.t >= 1) { sparks.splice(i, 1); continue }
        const pr1 = projected[s.i1], pr2 = projected[s.i2]
        if (!pr1 || !pr2) { sparks.splice(i, 1); continue }
        const sx = pr1.x + (pr2.x - pr1.x) * s.t
        const sy = pr1.y + (pr2.y - pr1.y) * s.t
        const fade = Math.sin(s.t * Math.PI)
        ctx.shadowBlur = 16
        ctx.shadowColor = 'rgba(218,241,222,1)'
        ctx.beginPath()
        ctx.arc(sx, sy, 2.8 * fade, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(218,241,222,${fade * 0.92})`
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // ── Core glow (pulsing) — sage green ──
      const coreAlpha = 0.4 + Math.sin(time * 0.9) * 0.14
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2)
      coreGrad.addColorStop(0, `rgba(218,241,222,${coreAlpha * 1.3})`)
      coreGrad.addColorStop(0.4, `rgba(142,182,155,${coreAlpha})`)
      coreGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.2, 0, Math.PI * 2)
      ctx.fill()

      time += 0.012
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [mouseX, mouseY])

  return <canvas ref={canvasRef} className="w-full h-full block" />
}

/* ─── Live ticker ───────────────────────────────────────────── */
const TICKER = [
  { name: 'Priya M.',  city: 'Mumbai',    action: 'Legacy sealed',         col: '#8EB69B' },
  { name: 'Arjun S.',  city: 'Delhi',     action: 'Vault created',         col: '#DAF1DE' },
  { name: 'Kavya N.',  city: 'Bangalore', action: '47 memories added',     col: '#8EB69B' },
  { name: 'Rohit K.',  city: 'Chennai',   action: 'Beneficiary set',       col: '#DAF1DE' },
  { name: 'Anjali R.', city: 'Hyderabad', action: 'Capsule time-locked',   col: '#8EB69B' },
  { name: 'Vikram T.', city: 'Pune',      action: 'Documents encrypted',   col: '#DAF1DE' },
  { name: 'Meera L.',  city: 'Kolkata',   action: 'Family circle created',  col: '#8EB69B' },
  { name: 'Suresh P.', city: 'Ahmedabad', action: 'Voice notes saved',     col: '#DAF1DE' },
]

function LiveTicker() {
  const doubled = [...TICKER, ...TICKER]
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 overflow-hidden"
      style={{ height: 38, background: 'rgba(5,31,32,0.94)', borderTop: '1px solid rgba(142,182,155,0.1)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center h-full">
        <div
          className="flex items-center gap-2 px-4 flex-shrink-0 h-full"
          style={{ borderRight: '1px solid rgba(142,182,155,0.1)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#8EB69B', boxShadow: '0 0 6px rgba(142,182,155,0.9)' }} />
          <span className="font-sora text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#8EB69B' }}>LIVE</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-track">
            {doubled.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-5 flex-shrink-0">
                <span className="font-sora text-xs font-semibold" style={{ color: item.col }}>{item.name}</span>
                <span style={{ color: '#163832' }}>·</span>
                <span className="font-inter text-xs" style={{ color: '#235347' }}>{item.city}</span>
                <span style={{ color: '#163832' }}>·</span>
                <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>{item.action}</span>
                <span className="mx-3 opacity-20 text-xs" style={{ color: '#8EB69B' }}>◆</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Iris transition ───────────────────────────────────────── */
function IrisTransition({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div className="fixed inset-0 z-[9999]" style={{ background: '#051F20' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 flex items-center justify-center">
            <motion.div className="rounded-full" style={{ background: '#051F20' }}
              initial={{ width: 0, height: 0 }}
              animate={{ width: '300vmax', height: '300vmax' }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Entry Navbar ──────────────────────────────────────────── */
function EntryNavbar({ onConnect }) {
  const navigate = useNavigate()
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-12 h-16"
      style={{
        background: 'rgba(5,31,32,0.82)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(142,182,155,0.08)',
      }}
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          style={{ perspective: '200px' }}
          whileHover={{ scale: 1.08 }}
        >
          <img
            src="/logo.png"
            alt="DeadDrop"
            className="w-10 h-10 rounded-full"
            style={{
              transform: 'rotateY(-12deg) rotateX(4deg)',
              boxShadow: '4px 4px 16px rgba(142,182,155,0.25), -1px -1px 6px rgba(142,182,155,0.08)',
              filter: 'drop-shadow(0 0 8px rgba(142,182,155,0.3))',
              transformStyle: 'preserve-3d',
            }}
          />
        </motion.div>
        <span className="font-sora font-bold text-sm tracking-tight" style={{ color: '#DAF1DE' }}>DeadDrop</span>
        <span className="hidden sm:block text-[9px] font-inter tracking-[0.22em] uppercase ml-1" style={{ color: 'rgba(142,182,155,0.35)' }}>Digital Legacy Vault</span>
      </div>

      <nav className="hidden md:flex items-center gap-0.5">
        {[['About', '/about'], ['For Organizations', '/organizations'], ['Claim Legacy', '/claim']].map(([label, path]) => (
          <button key={label} onClick={() => navigate(path)}
            className="px-4 py-2 font-inter text-sm rounded-lg transition-all duration-200"
            style={{ color: 'rgba(218,241,222,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(218,241,222,0.88)'; e.currentTarget.style.background = 'rgba(142,182,155,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(218,241,222,0.4)'; e.currentTarget.style.background = 'transparent' }}
          >{label}</button>
        ))}
      </nav>

      <motion.button onClick={onConnect}
        className="font-sora font-semibold text-sm px-5 py-2 rounded-lg"
        style={{ color: '#8EB69B', border: '1px solid rgba(142,182,155,0.32)' }}
        whileHover={{ background: 'rgba(142,182,155,0.1)', borderColor: 'rgba(142,182,155,0.65)', boxShadow: '0 0 22px rgba(142,182,155,0.2)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.18 }}
      >Open Vault</motion.button>
    </motion.header>
  )
}

/* ─── Animated counter ──────────────────────────────────────── */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const end = target
    const dur = 1800
    const step = 16
    const inc = end / (dur / step)
    const timer = setInterval(() => {
      start += inc
      if (start >= end) { setVal(end); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [target])
  return <>{val.toLocaleString()}{suffix}</>
}

/* ─── Stat chip ─────────────────────────────────────────────── */
function Stat({ value, label, delay, isCounter, suffix }) {
  return (
    <motion.div className="flex flex-col gap-0.5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="font-sora font-bold text-xl leading-none" style={{ color: '#8EB69B', letterSpacing: '-0.04em' }}>
        {isCounter ? <Counter target={value} suffix={suffix} /> : value}
      </span>
      <span className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.45)' }}>{label}</span>
    </motion.div>
  )
}

/* ── DATA CARDS on the right ──────────────────────────────────── */
const DATA_CARDS = [
  { label: 'LAST ACTIVE',   value: '2 days ago',  col: '#8EB69B',  delay: 1.0 },
  { label: 'CAPSULES',      value: '4 sealed',    col: '#DAF1DE',  delay: 1.15 },
  { label: 'BENEFICIARIES', value: '3 assigned',  col: '#8EB69B',  delay: 1.3 },
]

/* ══════════════════════════════════════════════════════════════
   ENTRY PAGE
══════════════════════════════════════════════════════════════ */
export default function EntryPage() {
  const navigate = useNavigate()
  const { walletConnected, walletAddress, lang, setDemoMode } = useAppStore()
  const tr = useTranslation(lang)
  const [transitioning, setTransitioning] = useState(false)
  const [vaultCount] = useState(12847 + Math.floor(Math.random() * 80))

  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0)

  const handleMouseMove = useCallback(e => {
    mouseX.set(e.clientX)
    mouseY.set(e.clientY)
  }, [mouseX, mouseY])

  // Force body to deep forest
  useEffect(() => {
    const root = document.querySelector('#root > div')
    const prevRoot = root?.style.backgroundColor
    const prevBody = document.body.style.backgroundColor
    if (root) root.style.backgroundColor = '#051F20'
    document.body.style.backgroundColor = '#051F20'
    return () => {
      if (root) root.style.backgroundColor = prevRoot || ''
      document.body.style.backgroundColor = prevBody || ''
    }
  }, [])

  const go = (to) => {
    setTransitioning(true)
    setTimeout(() => navigate(to), 820)
  }

  const short = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ background: '#051F20' }}
      onMouseMove={handleMouseMove}
    >
      {/* Subtle ambient radial — deep forest */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 65% 70% at 72% 50%, rgba(35,83,71,0.14) 0%, rgba(11,43,38,0.08) 55%, transparent 85%)',
      }} />

      {/* Floating particle noise layer */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 40% 60% at 20% 80%, rgba(22,56,50,0.12) 0%, transparent 70%)',
      }} />

      <IrisTransition active={transitioning} />
      <EntryNavbar onConnect={() => go('/connect')} />

      {/* ── MAIN LAYOUT ── */}
      <div className="relative z-10 min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[44%_56%]">

        {/* ──────── LEFT: Hero ──────── */}
        <div className="flex flex-col justify-center px-8 md:px-14 lg:px-16 pt-24 pb-16">

          {/* Live badge */}
          <motion.div className="flex items-center gap-2 mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#8EB69B', boxShadow: '0 0 7px rgba(142,182,155,0.9)' }} />
            <span className="font-sora text-[10px] tracking-[0.22em] uppercase" style={{ color: 'rgba(142,182,155,0.65)' }}>
              DIGITAL LEGACY VAULT
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            className="font-sora font-bold leading-[1.03] tracking-[-0.035em] mb-5"
            style={{ fontSize: 'clamp(2.5rem, 4.8vw, 4.4rem)', color: '#DAF1DE' }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            {walletConnected ? (
              <><span style={{ color: '#DAF1DE' }}>Welcome back,</span><br /><span style={{ color: '#8EB69B' }}>{short}</span></>
            ) : (
              <><span style={{ color: '#DAF1DE' }}>Your memories</span><br /><span style={{ color: '#8EB69B' }}>outlive everything.</span></>
            )}
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="font-inter leading-relaxed mb-8 max-w-[400px]"
            style={{ fontSize: 'clamp(0.9rem, 1.4vw, 1.05rem)', color: 'rgba(142,182,155,0.6)' }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.55 }}
          >
            {walletConnected
              ? 'Every file and capsule is encrypted and on-chain, waiting exactly as you left it.'
              : 'Encrypted before upload. Owned forever on-chain. Released exactly when you decide.'}
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex flex-wrap gap-3 mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.5 }}>
            <motion.button
              onClick={() => go(walletConnected ? '/dashboard' : '/connect')}
              className="font-sora font-semibold text-sm px-7 py-3 rounded-lg"
              style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.38)' }}
              whileHover={{ background: 'rgba(142,182,155,0.18)', boxShadow: '0 0 30px rgba(142,182,155,0.22)', y: -2 }}
              whileTap={{ scale: 0.97, y: 0 }}
            >
              {walletConnected ? 'Open Vault' : 'Open My Vault'}
            </motion.button>
            <motion.button
              onClick={walletConnected ? () => go('/memory') : () => { setDemoMode(true); go('/profiles') }}
              className="font-sora font-semibold text-sm px-7 py-3 rounded-lg"
              style={{ color: 'rgba(218,241,222,0.45)', border: '1px solid rgba(218,241,222,0.1)' }}
              whileHover={{ color: 'rgba(218,241,222,0.88)', borderColor: 'rgba(218,241,222,0.28)', y: -2 }}
              whileTap={{ scale: 0.97, y: 0 }}
            >
              {walletConnected ? 'Memory Space' : 'See Demo'}
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div className="flex gap-8 mb-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72 }}>
            <Stat value={vaultCount} label="vaults protected" delay={0.72} isCounter suffix="" />
            <Stat value="AES-256" label="client-side encryption" delay={0.84} />
            <Stat value="Polygon" label="immutable on-chain" delay={0.96} />
          </motion.div>

          {/* Footer whisper */}
          <motion.div className="flex items-center gap-2.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
            <div className="w-5 h-px" style={{ background: 'rgba(142,182,155,0.2)' }} />
            <span className="font-inter text-xs italic" style={{ color: 'rgba(142,182,155,0.35)' }}>
              Your keys. Your memories. No one else.
            </span>
          </motion.div>
        </div>

        {/* ──────── RIGHT: Neural Orb ──────── */}
        <div className="relative hidden lg:block">
          {/* Edge vignettes — deep forest */}
          <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #051F20 0%, transparent 6%, transparent 94%, #051F20 100%)' }} />
          <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #051F20 0%, transparent 7%, transparent 86%, #051F20 100%)' }} />

          {/* Canvas */}
          <NeuralOrb mouseX={mouseX} mouseY={mouseY} />

          {/* Data overlay cards */}
          <div className="absolute top-[14%] right-7 z-20 flex flex-col gap-2.5">
            {DATA_CARDS.map((card) => (
              <motion.div key={card.label}
                className="px-3.5 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(5,31,32,0.78)',
                  border: `1px solid rgba(142,182,155,0.12)`,
                  backdropFilter: 'blur(14px)',
                  minWidth: 155,
                }}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: card.delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="font-sora text-[8.5px] tracking-[0.2em] uppercase mb-0.5" style={{ color: `rgba(142,182,155,0.45)` }}>{card.label}</p>
                <p className="font-sora font-semibold text-xs" style={{ color: card.col }}>{card.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom left badge */}
          <motion.div
            className="absolute bottom-[13%] left-8 z-20 px-4 py-2.5 rounded-xl"
            style={{
              background: 'rgba(5,31,32,0.82)',
              border: '1px solid rgba(142,182,155,0.1)',
              backdropFilter: 'blur(16px)',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.5 }}
          >
            <p className="font-sora text-[8.5px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(142,182,155,0.38)' }}>ON-CHAIN IDENTITY</p>
            <p className="font-inter text-xs" style={{ color: 'rgba(218,241,222,0.7)' }}>Polygon · IPFS · Chainlink</p>
          </motion.div>
        </div>
      </div>

      <LiveTicker />
      <ThemeToggle />
      <LangToggle />
    </div>
  )
}
