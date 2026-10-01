import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

function Reveal({ children, delay = 0, className = '', y = 24 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* ─── 01 · THE PROBLEM ───────────────────────────────────────────
   Deliberate palette break: warm rust/amber reads as loss and
   urgency (mortality salience) against the cool forest-green
   trust palette everywhere else on the page. It's the one place
   the app leans into an uncomfortable feeling on purpose. ──── */
function ProblemSection() {
  const STATS = [
    { value: '~$50B+', label: 'in crypto (industry estimates) sits locked forever — owners died without leaving access' },
    { value: 'Billions', label: 'of family photos vanish every year when a cloud subscription lapses' },
    { value: '0', label: 'of it comes back once the password manager, the lawyer, or the company is gone' },
  ]
  return (
    <section className="relative py-28 px-6 md:px-14 lg:px-20" style={{ background: '#1A0F0A' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 55% 60% at 30% 20%, rgba(209,96,31,0.1) 0%, transparent 70%)',
      }} />
      <div className="relative max-w-5xl mx-auto">
        <Reveal>
          <p className="font-sora text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: 'rgba(209,96,31,0.75)' }}>
            The part nobody plans for
          </p>
          <h2 className="font-sora font-bold leading-[1.1] mb-6" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.9rem)', color: '#F3D9C4' }}>
            Every password manager, every crypto wallet, every cloud drive<br className="hidden md:block" />
            {' '}was built to keep people <em style={{ fontStyle: 'italic', color: '#D1601F' }}>out</em> — including the one person
            <br className="hidden md:block" /> who was supposed to inherit it.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {STATS.map((s, i) => (
            <Reveal key={s.value} delay={0.1 + i * 0.12}>
              <div className="p-6 rounded-2xl h-full" style={{ background: 'rgba(209,96,31,0.06)', border: '1px solid rgba(209,96,31,0.18)' }}>
                <p className="font-sora font-bold text-4xl mb-3" style={{ color: '#D1601F', letterSpacing: '-0.03em' }}>{s.value}</p>
                <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(243,217,196,0.7)' }}>{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── 02 · WHAT WE'RE TRYING TO PROVE ────────────────────────────
   Back to the trust-green world — calm, deliberate, the opposite
   feeling of the section above on purpose. ──────────────────── */
/* ─── 03 · HOW IT WORKS ──────────────────────────────────────────
   The actual mechanism, plainly, as a real sequence — numbering
   here is legitimate because it IS a fixed order of events. ─── */
function HowItWorksSection() {
  const STEPS = [
    { n: '01', title: 'You seal it', body: 'Deposit ETH, write a final message, upload files. Everything is locked with a key only you hold, before it leaves your device.' },
    { n: '02', title: 'You check in', body: 'Ping the vault every few months to prove you’re still here. One transaction resets the clock — that’s the whole ritual.' },
    { n: '03', title: 'Silence starts the countdown', body: 'Miss your inactivity window and a grace period starts automatically — no one has to notice, or ask.' },
    { n: '04', title: 'Your people receive it', body: 'If the grace period lapses without a ping, your named beneficiaries can claim their share. If you ping in time, nothing happens at all.' },
  ]
  return (
    <section className="relative py-28 px-6 md:px-14 lg:px-20" style={{ background: 'var(--c-1)' }}>
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <p className="font-sora text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: 'rgba(var(--c-4-rgb),0.65)' }}>
            How it actually works
          </p>
          <h2 className="font-sora font-bold leading-[1.1] mb-16" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.9rem)', color: 'var(--c-5)', maxWidth: '30ch' }}>
            Four steps. No lawyers in any of them.
          </h2>
        </Reveal>

        <div className="relative">
          <div className="hidden md:block absolute left-0 right-0 top-6 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(var(--c-4-rgb),0.25) 8%, rgba(var(--c-4-rgb),0.25) 92%, transparent)' }} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={0.08 + i * 0.12}>
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-sora font-bold text-sm mb-5 relative z-10"
                    style={{ background: 'var(--c-1)', border: '2px solid rgba(var(--c-4-rgb),0.45)', color: 'var(--c-4)' }}
                  >{s.n}</div>
                  <h3 className="font-sora font-semibold text-base mb-2.5" style={{ color: 'var(--c-5)' }}>{s.title}</h3>
                  <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(var(--c-4-rgb),0.6)' }}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── 04 · TRUST / PROOF BAR ─────────────────────────────────── */
/* ─── 05 · FINAL CTA ─────────────────────────────────────────── */
function FinalCtaSection({ onPrimary, onSecondary, primaryLabel, secondaryLabel }) {
  return (
    <section className="relative py-32 px-6 text-center" style={{ background: 'var(--c-1)' }}>
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <h2 className="font-sora font-bold leading-[1.15] mb-5" style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', color: 'var(--c-5)' }}>
            Nobody plans to disappear.<br />That's exactly why this exists.
          </h2>
          <p className="font-inter text-sm mb-10" style={{ color: 'rgba(var(--c-4-rgb),0.6)' }}>
            Takes about two minutes. No wallet required to start.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <motion.button
              onClick={onPrimary}
              className="font-sora font-semibold text-sm px-8 py-3.5 rounded-lg"
              style={{ background: 'rgba(var(--c-4-rgb),0.14)', color: 'var(--c-5)', border: '1px solid rgba(var(--c-4-rgb),0.4)' }}
              whileHover={{ background: 'rgba(142,182,155,0.22)', boxShadow: '0 0 34px rgba(142,182,155,0.25)', y: -2 }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >{primaryLabel}</motion.button>
            <motion.button
              onClick={onSecondary}
              className="font-sora font-semibold text-sm px-8 py-3.5 rounded-lg"
              style={{ color: 'rgba(var(--c-5-rgb),0.55)', border: '1px solid rgba(var(--c-5-rgb),0.14)' }}
              whileHover={{ color: 'rgba(218,241,222,0.9)', borderColor: 'rgba(218,241,222,0.3)', y: -2 }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >{secondaryLabel}</motion.button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function LandingSections({ onPrimary, onSecondary, primaryLabel, secondaryLabel }) {
  return (
    <>
      <ProblemSection />
      <HowItWorksSection />
      <FinalCtaSection
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
    </>
  )
}
