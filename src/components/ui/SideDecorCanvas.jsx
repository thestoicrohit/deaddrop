import { useEffect, useRef } from 'react'

/**
 * SideDecorCanvas — decorative canvas art for inner page edges.
 * type: 'hand-left' | 'hand-right' | 'sphere' | 'face' | 'shield' | 'data-stream'
 */
export default function SideDecorCanvas({ type = 'hand-left', style = {} }) {
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

    let time = 0

    // ── Shared helpers ──
    const sage  = [142, 182, 155]
    const mint  = [218, 241, 222]
    const forest = [35, 83, 71]
    const moss  = [11, 43, 38]

    // ─── HAND (left or right) ─────────────────────────────────
    if (type === 'hand-left' || type === 'hand-right') {
      const flip = type === 'hand-right'
      const cx = flip ? W * 0.6 : W * 0.4
      const cy = H * 0.52

      // Glowing ring
      const RING_R = Math.min(W, H) * 0.38
      let ringAngle = 0

      // Node cluster (hand silhouette rough approximation)
      const N = 220
      const nodes = Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * Math.PI * 2
        const baseR = RING_R * (0.15 + Math.random() * 0.78)
        // Shape the cluster to suggest a hand/organic blob
        const handShape = 0.7 + 0.3 * Math.sin(angle * 2.5)
        const r = baseR * handShape
        return {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r * 1.35,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          size: 1.0 + Math.random() * 2.4,
          alpha: 0.45 + Math.random() * 0.50,
          phase: Math.random() * Math.PI * 2,
          col: [sage, mint, forest][Math.floor(Math.random() * 3)],
        }
      })

      // Extended finger nodes
      const FINGERS = 5
      const fingerNodes = Array.from({ length: FINGERS * 8 }, (_, i) => {
        const fi = Math.floor(i / 8)
        const fi2 = i % 8
        const baseAngle = -0.8 + fi * 0.38
        const len = RING_R * (0.55 + fi2 * 0.06)
        return {
          x: cx + Math.cos(baseAngle) * len + (Math.random() - 0.5) * 14,
          y: cy - Math.sin(baseAngle) * len * 0.8 + (Math.random() - 0.5) * 14 - RING_R * 0.4,
          size: 0.9 + Math.random() * 2.0,
          alpha: 0.40 + Math.random() * 0.50,
          phase: Math.random() * Math.PI * 2,
          col: [sage, mint][Math.floor(Math.random() * 2)],
        }
      })

      // Connections
      const edges = []
      for (let i = 0; i < N; i += 3) {
        for (let j = i + 1; j < N; j += 4) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          if (Math.sqrt(dx * dx + dy * dy) < RING_R * 0.28) {
            edges.push([i, j])
          }
        }
      }

      function drawHand() {
        ctx.clearRect(0, 0, W, H)
        ringAngle += 0.005

        // Glowing arc
        const arcAlpha = 0.60 + Math.sin(time * 0.8) * 0.15
        ctx.strokeStyle = `rgba(218,241,222,${arcAlpha})`
        ctx.lineWidth = 1.8
        ctx.shadowBlur = 28
        ctx.shadowColor = 'rgba(142,182,155,0.9)'
        ctx.beginPath()
        ctx.arc(cx, cy, RING_R, ringAngle, ringAngle + Math.PI * 1.55)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Second partial arc (thinner)
        ctx.strokeStyle = `rgba(142,182,155,${arcAlpha * 0.7})`
        ctx.lineWidth = 1.0
        ctx.shadowBlur = 14
        ctx.shadowColor = 'rgba(142,182,155,0.7)'
        ctx.beginPath()
        ctx.arc(cx, cy, RING_R * 0.78, ringAngle + Math.PI, ringAngle + Math.PI * 1.9)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Edges (connections between nodes)
        edges.forEach(([a, b]) => {
          const na = nodes[a], nb = nodes[b]
          const fade = 0.22 + Math.sin(time * 0.6 + na.phase) * 0.1
          const [r, g, bv] = sage
          ctx.beginPath()
          ctx.moveTo(na.x, na.y)
          ctx.lineTo(nb.x, nb.y)
          ctx.strokeStyle = `rgba(${r},${g},${bv},${fade})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        })

        // Finger nodes
        fingerNodes.forEach(p => {
          const pulse = 0.7 + 0.3 * Math.sin(time * 1.2 + p.phase)
          const a = p.alpha * pulse
          const [r, g, bv] = p.col
          ctx.shadowBlur = 14
          ctx.shadowColor = `rgba(${r},${g},${bv},0.9)`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${bv},${a})`
          ctx.fill()
        })
        ctx.shadowBlur = 0

        // Main node cluster
        nodes.forEach(p => {
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.99
          p.vy *= 0.99
          if (Math.random() < 0.01) { p.vx += (Math.random() - 0.5) * 0.06; p.vy += (Math.random() - 0.5) * 0.06 }

          const pulse = 0.65 + 0.35 * Math.sin(time * 0.9 + p.phase)
          const a = p.alpha * pulse
          const [r, g, bv] = p.col
          ctx.shadowBlur = p.size > 1.5 ? 14 : 6
          ctx.shadowColor = `rgba(${r},${g},${bv},0.85)`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${bv},${a})`
          ctx.fill()
        })
        ctx.shadowBlur = 0

        time += 0.01
        rafRef.current = requestAnimationFrame(drawHand)
      }
      drawHand()
    }

    // ─── SPHERE (compact neural orb for side decoration) ──────
    if (type === 'sphere') {
      const cx = W * 0.5
      const cy = H * 0.5
      const R = Math.min(W, H) * 0.38

      const COLORS = [[142,182,155],[218,241,222],[35,83,71]]
      const PHI = (1 + Math.sqrt(5)) / 2
      const N = 180

      const pts = Array.from({ length: N }, (_, i) => {
        const t = i / (N - 1)
        const polar = Math.acos(1 - 2 * t)
        const azim = 2 * Math.PI * i / PHI
        return {
          sx: Math.sin(polar) * Math.cos(azim),
          sy: Math.sin(polar) * Math.sin(azim),
          sz: Math.cos(polar),
          r: R * (0.85 + Math.random() * 0.3),
          ph: Math.random() * Math.PI * 2,
          sp: 0.1 + Math.random() * 0.25,
          rgb: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 0.4 + Math.random() * 0.55,
          size: 0.7 + Math.random() * 1.6,
        }
      })

      const projected = new Array(N)
      let rotY = 0

      const rings = [
        { tilt: 20, speed: 0.008,  r: R * 1.15, rgb: '142,182,155', alpha: 0.4 },
        { tilt: 65, speed: -0.005, r: R * 1.04, rgb: '218,241,222', alpha: 0.28 },
      ]
      const ringAngles = [0, 0]

      function drawSphere() {
        ctx.clearRect(0, 0, W, H)
        rotY += 0.004

        const cosY = Math.cos(rotY), sinY = Math.sin(rotY)
        const cosX = Math.cos(0.15), sinX = Math.sin(0.15)

        pts.forEach((p, idx) => {
          const pulse = 1 + Math.sin(time * p.sp + p.ph) * 0.02
          const r2 = p.r * pulse
          let x3 = p.sx * r2, y3 = p.sy * r2, z3 = p.sz * r2
          const rx2 = x3 * cosY - z3 * sinY
          const rz2 = x3 * sinY + z3 * cosY
          const ry3 = y3 * cosX - rz2 * sinX
          const rz3 = y3 * sinX + rz2 * cosX
          const persp = 3 / (3 + rz3 / R)
          projected[idx] = { x: cx + rx2 * persp, y: cy - ry3 * persp, depth: (rz3 + R) / (2 * R) }
        })

        // Ambient glow
        const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3)
        amb.addColorStop(0, 'rgba(35,83,71,0.12)')
        amb.addColorStop(1, 'transparent')
        ctx.fillStyle = amb
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2); ctx.fill()

        // Rings
        rings.forEach((ring, ri) => {
          ringAngles[ri] += ring.speed
          ctx.beginPath()
          for (let s = 0; s <= 80; s++) {
            const a = (s / 80) * Math.PI * 2 + ringAngles[ri]
            const tiltRad = ring.tilt * Math.PI / 180
            let rx3 = ring.r * Math.cos(a)
            let ry3b = ring.r * Math.sin(a) * Math.cos(tiltRad)
            let rz3b = ring.r * Math.sin(a) * Math.sin(tiltRad)
            const rx4 = rx3 * cosY - rz3b * sinY
            const rz4 = rx3 * sinY + rz3b * cosY
            const ry4 = ry3b * cosX - rz4 * sinX
            const rz5 = ry3b * sinX + rz4 * cosX
            const p2 = 3 / (3 + rz5 / R)
            if (s === 0) ctx.moveTo(cx + rx4 * p2, cy - ry4 * p2)
            else ctx.lineTo(cx + rx4 * p2, cy - ry4 * p2)
          }
          ctx.strokeStyle = `rgba(${ring.rgb},${ring.alpha})`
          ctx.lineWidth = 0.8; ctx.stroke()
        })

        // Connection edges
        const CONN2 = (R * 0.48) ** 2
        for (let i = 0; i < N; i++) {
          if (projected[i].depth < 0.2) continue
          for (let j = i + 1; j < N; j++) {
            if (projected[j].depth < 0.2) continue
            const pi = pts[i], pj = pts[j]
            const dx3 = pi.sx * pi.r - pj.sx * pj.r
            const dy3 = pi.sy * pi.r - pj.sy * pj.r
            const dz3 = pi.sz * pi.r - pj.sz * pj.r
            const d2 = dx3 * dx3 + dy3 * dy3 + dz3 * dz3
            if (d2 < CONN2) {
              const alpha = (1 - Math.sqrt(d2) / (R * 0.48)) * projected[i].depth * 0.3
              ctx.beginPath()
              ctx.moveTo(projected[i].x, projected[i].y)
              ctx.lineTo(projected[j].x, projected[j].y)
              ctx.strokeStyle = `rgba(142,182,155,${alpha})`
              ctx.lineWidth = 0.4; ctx.stroke()
            }
          }
        }

        // Nodes
        const order = projected.map((_, i) => i).sort((a, b) => projected[a].depth - projected[b].depth)
        order.forEach(idx => {
          const p = pts[idx]; const pr = projected[idx]
          const df = 0.15 + pr.depth * 0.85
          const sz = p.size * (0.5 + pr.depth * 0.5)
          const [r, g, b] = p.rgb
          ctx.shadowBlur = pr.depth > 0.6 ? 8 : 0
          ctx.shadowColor = `rgba(${r},${g},${b},0.8)`
          ctx.beginPath(); ctx.arc(pr.x, pr.y, Math.max(0.3, sz), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * df})`
          ctx.fill()
        })
        ctx.shadowBlur = 0

        // Core pulse
        const cA = 0.35 + Math.sin(time * 0.9) * 0.12
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.16)
        cg.addColorStop(0, `rgba(218,241,222,${cA * 1.3})`); cg.addColorStop(1, 'transparent')
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2); ctx.fill()

        time += 0.012
        rafRef.current = requestAnimationFrame(drawSphere)
      }
      drawSphere()
    }

    // ─── DATA STREAM (for Private Safe) ──────────────────────
    if (type === 'data-stream') {
      const LINES = 18
      const lines = Array.from({ length: LINES }, (_, i) => ({
        x: (W / LINES) * i + Math.random() * (W / LINES),
        y: Math.random() * H,
        speed: 0.5 + Math.random() * 1.5,
        len: 50 + Math.random() * 160,
        alpha: 0.45 + Math.random() * 0.45,
        col: [sage, mint, forest][Math.floor(Math.random() * 3)],
        bits: Array.from({ length: 8 }, () => Math.random() > 0.5 ? '1' : '0'),
        bitTimer: 0,
      }))

      function drawData() {
        ctx.clearRect(0, 0, W, H)

        lines.forEach(line => {
          line.y += line.speed
          if (line.y - line.len > H) {
            line.y = -line.len
            line.x = Math.random() * W
          }
          line.bitTimer++
          if (line.bitTimer > 12) {
            line.bits.shift(); line.bits.push(Math.random() > 0.5 ? '1' : '0')
            line.bitTimer = 0
          }

          const [r, g, b] = line.col
          // Glowing tail
          const grad = ctx.createLinearGradient(line.x, line.y - line.len, line.x, line.y)
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
          grad.addColorStop(0.7, `rgba(${r},${g},${b},${line.alpha * 0.5})`)
          grad.addColorStop(1, `rgba(${r},${g},${b},${line.alpha})`)
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.moveTo(line.x, line.y - line.len); ctx.lineTo(line.x, line.y); ctx.stroke()

          // Head dot
          ctx.shadowBlur = 20
          ctx.shadowColor = `rgba(${r},${g},${b},1)`
          ctx.beginPath(); ctx.arc(line.x, line.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(line.alpha * 1.6, 1)})`
          ctx.fill(); ctx.shadowBlur = 0

          // Binary bits along the stream
          ctx.font = '9px monospace'
          ctx.fillStyle = `rgba(${r},${g},${b},${line.alpha * 0.85})`
          line.bits.forEach((bit, bi) => {
            const by = line.y - (bi * 14) - 6
            if (by > 0 && by < H) ctx.fillText(bit, line.x - 3, by)
          })
        })

        time += 0.01
        rafRef.current = requestAnimationFrame(drawData)
      }
      drawData()
    }

    return () => cancelAnimationFrame(rafRef.current)
  }, [type])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ display: 'block', ...style }}
    />
  )
}
