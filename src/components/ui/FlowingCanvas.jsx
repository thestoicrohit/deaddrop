import { useEffect, useRef } from 'react'

/**
 * FlowingCanvas — dramatic live aurora / northern-lights background
 * Three-layer system:
 *  1) Wide glowing ribbon bands (the aurora curtains)
 *  2) Bright particle streams riding the bands
 *  3) Ambient radial bloom orbs
 *
 * Canvas is TRANSPARENT — the page's dark CSS background shows through.
 * This lets backdrop-filter blur on glass-cards work correctly.
 */
export default function FlowingCanvas() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = window.innerWidth
    let H = window.innerHeight

    const setSize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ctx = canvas.getContext('2d')
    setSize()
    window.addEventListener('resize', setSize)

    // ── Palette ──────────────────────────────────────────────────────────
    const SAGE   = [142, 182, 155]
    const MINT   = [218, 241, 222]
    const FOREST = [35,  83,  71 ]
    const COLS   = [SAGE, MINT, SAGE, FOREST, MINT, SAGE, FOREST]

    // ── Layer 1: Aurora ribbon bands ─────────────────────────────────────
    // Wide horizontal gradient sheets that move slowly — the curtain effect
    const RIBBON_COUNT = 8
    const ribbons = Array.from({ length: RIBBON_COUNT }, (_, i) => {
      const col = COLS[i % COLS.length]
      return {
        col,
        yFrac:   (i + 0.5) / RIBBON_COUNT,
        height:  H * (0.18 + Math.random() * 0.22),   // 18–40% screen height
        amp:     50 + Math.random() * 90,              // vertical drift range
        speed:   0.002 + Math.random() * 0.004,        // drift speed
        phase:   Math.random() * Math.PI * 2,
        alpha:   0.045 + Math.random() * 0.045,        // 0.045–0.09 per band
        waveAmp: 15 + Math.random() * 25,              // horizontal waviness
        waveF:   0.0015 + Math.random() * 0.002,       // horizontal wave freq
      }
    })

    // ── Layer 2: Particle streams ─────────────────────────────────────────
    const STREAMS = 7
    const PPS     = 70   // particles per stream

    const streams = Array.from({ length: STREAMS }, (_, si) => {
      const col = COLS[si % COLS.length]
      return {
        col,
        yFrac: (si + 1) / (STREAMS + 1),
        amp:   80 + Math.random() * 160,
        freq:  0.0014 + Math.random() * 0.0026,
        phase: Math.random() * Math.PI * 2,
        particles: Array.from({ length: PPS }, (_, pi) => ({
          x:     (W / PPS) * pi + Math.random() * (W / PPS),
          yOff:  (Math.random() - 0.5) * 70,
          spd:   0.35 + Math.random() * 0.75,
          size:  1.6 + Math.random() * 3.8,   // 1.6–5.4 px  (was 0.6–2.8)
          alpha: 0.40 + Math.random() * 0.48, // 0.40–0.88   (was 0.08–0.46)
          phase: Math.random() * Math.PI * 2,
        })),
      }
    })

    // ── Layer 3: Ambient bloom orbs ───────────────────────────────────────
    const orbs = Array.from({ length: 6 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     150 + Math.random() * 280,
      alpha: 0.06 + Math.random() * 0.09,
      dx:    (Math.random() - 0.5) * 0.25,
      dy:    (Math.random() - 0.5) * 0.15,
      col:   COLS[Math.floor(Math.random() * 3)],
    }))

    let time = 0

    // ─────────────────────────────────────────────────────────────────────
    function draw() {
      // Transparent clear — CSS background colour shows through
      ctx.clearRect(0, 0, W, H)

      // ── 1. Aurora ribbon bands ──────────────────────────────────────────
      ribbons.forEach(rb => {
        const cy   = rb.yFrac * H + Math.sin(time * rb.speed + rb.phase) * rb.amp
        const halfH = rb.height / 2

        // Vertical soft-edge gradient (transparent → colour → transparent)
        const grad = ctx.createLinearGradient(0, cy - halfH * 1.4, 0, cy + halfH * 1.4)
        const [r, g, b] = rb.col
        grad.addColorStop(0,    `rgba(${r},${g},${b},0)`)
        grad.addColorStop(0.25, `rgba(${r},${g},${b},${rb.alpha * 0.55})`)
        grad.addColorStop(0.5,  `rgba(${r},${g},${b},${rb.alpha})`)
        grad.addColorStop(0.75, `rgba(${r},${g},${b},${rb.alpha * 0.55})`)
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`)

        // Wavy band path (8 segments — cheap + good-looking)
        ctx.beginPath()
        const SEG = 8
        // Top edge
        for (let s = 0; s <= SEG; s++) {
          const x = (s / SEG) * W
          const wy = Math.sin(x * rb.waveF + time * 0.7 + rb.phase) * rb.waveAmp
          if (s === 0) ctx.moveTo(x, cy - halfH + wy)
          else         ctx.lineTo(x, cy - halfH + wy)
        }
        // Bottom edge (reversed)
        for (let s = SEG; s >= 0; s--) {
          const x = (s / SEG) * W
          const wy = Math.sin(x * rb.waveF * 1.4 + time * 0.5 + rb.phase + 1.2) * rb.waveAmp
          ctx.lineTo(x, cy + halfH + wy)
        }
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
      })

      // ── 2. Ambient bloom orbs ───────────────────────────────────────────
      orbs.forEach(orb => {
        orb.x += orb.dx;  orb.y += orb.dy
        if (orb.x < -orb.r) orb.x = W + orb.r
        if (orb.x > W + orb.r) orb.x = -orb.r
        if (orb.y < -orb.r) orb.y = H + orb.r
        if (orb.y > H + orb.r) orb.y = -orb.r

        const [r, g, b] = orb.col
        const g2 = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
        g2.addColorStop(0, `rgba(${r},${g},${b},${orb.alpha})`)
        g2.addColorStop(1, 'transparent')
        ctx.fillStyle = g2
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // ── 3. Particle streams ─────────────────────────────────────────────
      streams.forEach(stream => {
        const [r, g, b] = stream.col
        stream.particles.forEach(p => {
          p.x += p.spd
          if (p.x > W + 8) p.x = -8

          const yBase = stream.yFrac * H
          const y = yBase
            + Math.sin(p.x * stream.freq + time + p.phase)        * stream.amp
            + Math.sin(p.x * stream.freq * 2.3 + time * 0.65)     * (stream.amp * 0.25)
            + p.yOff

          if (y < -10 || y > H + 10) return

          const pulse = 0.62 + 0.38 * Math.sin(time * 0.55 + p.phase)
          const a     = p.alpha * pulse

          // All particles > 1.8 px get strong glow
          if (p.size > 1.8) {
            ctx.shadowBlur  = p.size * 5.5
            ctx.shadowColor = `rgba(${r},${g},${b},0.9)`
          }
          ctx.beginPath()
          ctx.arc(p.x, y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`
          ctx.fill()
          ctx.shadowBlur = 0
        })
      })

      time += 0.007
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', setSize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
