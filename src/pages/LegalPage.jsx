import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const PRIVACY = {
  title: 'Privacy Policy',
  updated: 'Last updated: September 2026 — Beta',
  sections: [
    ['What we collect', `An email address and, optionally, a first name — only if you type them into
      the "Where should we reach you?" form. If you connect a wallet instead, we see your public wallet
      address, which is already public on Ethereum. We never collect your password, seed phrase, or
      private key — there is nowhere in the app that asks for them.`],
    ['What we never see', `Everything you store — vault deposits aside, which are just ETH amounts —
      is encrypted in your browser before it ever leaves your device. Final messages, Safe entries, and
      Memory capsule content are AES-256 ciphertext by the time they reach IPFS or the blockchain. We do
      not hold a copy of your decryption key and cannot read your content, even if asked to.`],
    ['Where your email is stored', `On the live site, the email (and first name, if given) you submit
      is saved — along with the time and the page you signed up from — to a private Google Sheet that
      only the DeadDrop maintainer can open. It is used only to contact you about DeadDrop, never sold
      or shared. Ask us (see Contact below) and we'll delete it.`],
    ['On-chain and IPFS data', `Wallet addresses, timestamps, and encrypted blobs written to Ethereum
      Sepolia or IPFS cannot be truly deleted once published — that's how public, content-addressed
      systems work. "Delete" in the app stops us from showing something; it does not erase it from a
      public ledger or from IPFS nodes that already fetched it. Because this content is encrypted, this
      is a much smaller exposure than storing plaintext would be, but it's a real one.`],
    ['Your rights', `You can ask us to stop contacting an email you submitted at any time — see the
      contact note below. You cannot ask us to delete on-chain or IPFS data, because we don't control
      it and neither does anyone else once it's published; only you, by never writing something you
      don't want public (in encrypted form), can prevent that.`],
    ['Applicable law', `We aim to meet the notice and consent expectations of India's Digital Personal
      Data Protection Act, 2023 (DPDP) and, for any EU/UK users, the GDPR. This is a beta project, not a
      registered Significant Data Fiduciary, and this page will be revised as the product and its legal
      review mature.`],
    ['Contact', `This is an independent beta project. For any privacy question or request, reach out
      through the contact listed in the project's README on GitHub.`],
  ],
}

const TERMS = {
  title: 'Terms of Service',
  updated: 'Last updated: September 2026 — Beta',
  sections: [
    ['Beta software, no warranty', `DeadDrop is beta software running on Ethereum Sepolia testnet. It
      is provided "as is," with no warranty of any kind. Contracts have not been through an independent
      security audit. Do not store anything you cannot afford to lose access to.`],
    ['No custody, no liability for lost keys', `DeadDrop does not hold, control, or have access to any
      funds, keys, or content you store. Everything lives in smart contracts you interact with directly
      through your own wallet. If you lose your wallet's seed phrase, there is currently no recovery
      mechanism — your vault, Safe entries, and Memory capsules become permanently unreadable. We are
      not liable for lost access, lost funds, or lost data of any kind.`],
    ['Free, no payment', `DeadDrop does not charge for its core features. Any blockchain gas fees you
      pay go to the network, not to DeadDrop.`],
    ['Acceptable use', `Don't use DeadDrop to store or distribute illegal content, or to interfere with
      the service, other users, or the underlying smart contracts.`],
    ['Changes', `These terms may change as the product moves out of beta. Material changes will be
      reflected here with an updated date.`],
  ],
}

export default function LegalPage() {
  const { doc } = useParams()
  const content = doc === 'terms' ? TERMS : PRIVACY

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '96px' }}>
      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/privacy" className="font-inter text-xs uppercase tracking-widest" style={{ color: doc !== 'terms' ? 'var(--c-5)' : 'rgba(var(--c-4-rgb),0.5)' }}>Privacy</Link>
            <span style={{ color: 'rgba(var(--c-4-rgb),0.3)' }}>·</span>
            <Link to="/terms" className="font-inter text-xs uppercase tracking-widest" style={{ color: doc === 'terms' ? 'var(--c-5)' : 'rgba(var(--c-4-rgb),0.5)' }}>Terms</Link>
          </div>
          <h1 className="font-sora font-bold text-3xl mb-1" style={{ color: 'var(--c-5)' }}>{content.title}</h1>
          <p className="font-inter text-xs mb-8" style={{ color: 'rgba(var(--c-4-rgb),0.5)' }}>{content.updated}</p>

          <div className="space-y-6">
            {content.sections.map(([heading, body]) => (
              <div key={heading}>
                <h2 className="font-sora font-semibold text-sm mb-1.5" style={{ color: 'var(--c-4)' }}>{heading}</h2>
                <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(var(--c-5-rgb),0.75)' }}>{body}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
