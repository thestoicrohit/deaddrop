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
function MissionSection() {
  const BELIEFS = [
    { icon: '🔐', title: 'A vault should outlive its company.', body: 'DeadDrop isn’t a startup you trust with your legacy — it’s a smart contract on Ethereum. No servers to shut down, no support team to disappear, no "we’re sunsetting this product" email.' },
    { icon: '🔑', title: 'Only you should hold the key.', body: 'Every file is encrypted in your browser before it ever leaves your device. We never see your keys, your PIN, or your plaintext — not once, not even by accident.' },
    { icon: '⏳', title: 'Inheritance should need no permission.', body: 'No probate, no bank sign-off, no lawyer’s calendar. Once your inactivity window and grace period pass, the contract itself releases what you left behind — automatically, on schedule, to the people you named.' },
  ]
  return (
    <section className="relative py-28 px-6 md:px-14 lg:px-20" style={{ background: '#051F20' }}>
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <p className="font-sora text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: 'rgba(142,182,155,0.65)' }}>
            What we're trying to prove
          </p>
          <h2 className="font-sora font-bold leading-[1.1] mb-4" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.9rem)', color: '#DAF1DE', maxWidth: '38ch' }}>
            That code can keep a promise longer than a company can.
          </h2>
          <p className="font-inter text-base leading-relaxed mb-16" style={{ color: 'rgba(142,182,155,0.65)', maxWidth: '58ch' }}>
            Three things had to be true for us to build this at all.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BELIEFS.map((b, i) => (
            <Reveal key={b.title} delay={0.1 + i * 0.14}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                style={{ background: 'rgba(142,182,155,0.08)', border: '1px solid rgba(142,182,155,0.18)' }}
              >{b.icon}</div>
              <h3 className="font-sora font-semibold text-lg mb-3 leading-snug" style={{ color: '#DAF1DE' }}>{b.title}</h3>
              <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(142,182,155,0.6)' }}>{b.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── 03 · HOW IT WORKS ──────────────────────────────────────────
   The actual mechanism, plainly, as a real sequence — numbering
   here is legitimate because it IS a fixed order of events. ─── */
function HowItWorksSection() {
  const STEPS = [
    { n: '01', title: 'You seal it', body: 'Deposit ETH, write a final message, upload files. Everything is AES-256 encrypted client-side before it touches IPFS.' },
    { n: '02', title: 'You check in', body: 'Ping the vault every few months to prove you’re still here. One transaction resets the clock — that’s the whole ritual.' },
    { n: '03', title: 'Silence starts the countdown', body: 'Miss your inactivity window and Chainlink Automation opens a grace period on its own — no one has to notice, or ask.' },
    { n: '04', title: 'Your people receive it', body: 'If the grace period lapses without a ping, your named beneficiaries can claim their share. If you ping in time, nothing happens at all.' },
  ]
  return (
    <section className="relative py-28 px-6 md:px-14 lg:px-20" style={{ background: '#0B2B26' }}>
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <p className="font-sora text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: 'rgba(142,182,155,0.65)' }}>
            How it actually works
          </p>
          <h2 className="font-sora font-bold leading-[1.1] mb-16" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.9rem)', color: '#DAF1DE', maxWidth: '30ch' }}>
            Four steps. No lawyers in any of them.
          </h2>
        </Reveal>

        <div className="relative">
          <div className="hidden md:block absolute left-0 right-0 top-6 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(142,182,155,0.25) 8%, rgba(142,182,155,0.25) 92%, transparent)' }} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={0.08 + i * 0.12}>
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-sora font-bold text-sm mb-5 relative z-10"
                    style={{ background: '#0B2B26', border: '2px solid rgba(142,182,155,0.45)', color: '#8EB69B' }}
                  >{s.n}</div>
                  <h3 className="font-sora font-semibold text-base mb-2.5" style={{ color: '#DAF1DE' }}>{s.title}</h3>
                  <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(142,182,155,0.6)' }}>{s.body}</p>
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
function TrustSection() {
  const PROOFS = [
    { label: 'AES-256', sub: 'Encrypted in your browser, before upload — we never hold a decryption key.' },
    { label: 'On-chain', sub: 'Vault logic lives on Ethereum. It runs the same whether we’re around or not.' },
    { label: 'IPFS', sub: 'Files are content-addressed and pinned, not sitting on a server we could take down.' },
    { label: 'Chainlink', sub: 'Automation nodes trigger your grace period — no human has to be watching.' },
  ]
  return (
    <section className="relative py-24 px-6 md:px-14 lg:px-20" style={{ background: '#051F20', borderTop: '1px solid rgba(142,182,155,0.08)' }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {PROOFS.map((p, i) => (
          <Reveal key={p.label} delay={i * 0.08} y={14}>
            <p className="font-sora font-bold text-lg mb-2" style={{ color: '#8EB69B' }}>{p.label}</p>
            <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(142,182,155,0.55)' }}>{p.sub}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ─── 05 · FINAL CTA ─────────────────────────────────────────── */
function FinalCtaSection({ onPrimary, onSecondary, primaryLabel, secondaryLabel }) {
  return (
    <section className="relative py-32 px-6 text-center" style={{ background: '#0B2B26' }}>
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <h2 className="font-sora font-bold leading-[1.15] mb-5" style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', color: '#DAF1DE' }}>
            Nobody plans to disappear.<br />That's exactly why this exists.
          </h2>
          <p className="font-inter text-sm mb-10" style={{ color: 'rgba(142,182,155,0.6)' }}>
            Takes about two minutes. No wallet required to start.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <motion.button
              onClick={onPrimary}
              className="font-sora font-semibold text-sm px-8 py-3.5 rounded-lg"
              style={{ background: 'rgba(142,182,155,0.14)', color: '#DAF1DE', border: '1px solid rgba(142,182,155,0.4)' }}
              whileHover={{ background: 'rgba(142,182,155,0.22)', boxShadow: '0 0 34px rgba(142,182,155,0.25)', y: -2 }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >{primaryLabel}</motion.button>
            <motion.button
              onClick={onSecondary}
              className="font-sora font-semibold text-sm px-8 py-3.5 rounded-lg"
              style={{ color: 'rgba(218,241,222,0.55)', border: '1px solid rgba(218,241,222,0.14)' }}
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
      <MissionSection />
      <HowItWorksSection />
      <TrustSection />
      <FinalCtaSection
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
    </>
  )
}
