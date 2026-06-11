import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import AuroraBackground from '@/components/ui/AuroraBackground'
import toast from 'react-hot-toast'

const STEP_LABELS = ['Connect', 'Profile', 'PIN']

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full font-sora font-bold text-sm transition-all duration-300"
            style={{
              background: i < step ? '#0B2B26' : i === step ? 'rgba(218,241,222,0.2)' : 'rgba(11,43,38,0.2)',
              border: i === step ? '2px solid #DAF1DE' : '2px solid transparent',
              color: i <= step ? '#DAF1DE' : '#8EB69B',
            }}
          >
            {i < step ? '✓' : i + 1}
          </div>
          <span className="text-xs font-inter hidden sm:block" style={{ color: i === step ? '#DAF1DE' : '#8EB69B' }}>
            {label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <div
              className="w-8 h-0.5 mx-1"
              style={{ background: i < step ? '#0B2B26' : 'rgba(218,241,222,0.15)' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function WalletButton({ icon, label, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(209,96,31,0.3)' }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
      style={{
        background: 'rgba(11,43,38,0.2)',
        border: '1px solid rgba(218,241,222,0.15)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ background: 'rgba(11,43,38,0.4)' }}
      >
        {icon}
      </div>
      <div className="text-left">
        <div className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{label}</div>
        <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>Connect securely</div>
      </div>
      <div className="ml-auto" style={{ color: '#8EB69B' }}>→</div>
    </motion.button>
  )
}

export default function ConnectPage() {
  const navigate = useNavigate()
  const { connectWallet, setDisplayName, setProfilePhoto, setSafePin, completeOnboarding, onboardingComplete } = useAppStore()
  const [step, setStep] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [displayName, setDN] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const photoInputRef = useRef(null)

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    setProfilePhoto(url)
    toast.success('Profile photo set.')
  }

  const MOCK_ADDR = '0x3f7a9b2d4e1c8f5a6b0d9e2c7f4a1b8e5c2d9f6a'

  const handleConnect = async (type) => {
    setConnecting(true)
    await new Promise(r => setTimeout(r, 1200))

    if (type === 'metamask' && !window.ethereum) {
      toast.error('MetaMask not found. Opening in demo mode.')
    }

    connectWallet(MOCK_ADDR)
    toast.success('Wallet connected.')

    if (onboardingComplete) {
      navigate('/dashboard')
    } else {
      setStep(1)
    }
    setConnecting(false)
  }

  const handleProfileNext = () => {
    if (!displayName.trim()) {
      toast.error('Please enter a display name.')
      return
    }
    setDisplayName(displayName)
    setStep(2)
  }

  const handlePinNext = () => {
    if (pin.length !== 6) {
      toast.error('PIN must be exactly 6 digits.')
      return
    }
    if (pin !== pinConfirm) {
      toast.error('PINs do not match.')
      return
    }
    setSafePin(pin)
    completeOnboarding()
    toast.success('Vault is ready. Welcome.')
    navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <AuroraBackground />

      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-8"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-sora font-bold text-2xl" style={{ color: '#DAF1DE' }}>
              DeadDrop
            </h1>
            <p className="font-inter text-sm mt-1" style={{ color: '#8EB69B' }}>
              Your vault awaits.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Connect */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col gap-4">
                  {connecting ? (
                    <div className="flex flex-col items-center py-8 gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 rounded-full border-2 border-t-transparent"
                        style={{ borderColor: '#DAF1DE', borderTopColor: 'transparent' }}
                      />
                      <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                        Connecting to your wallet…
                      </p>
                    </div>
                  ) : (
                    <>
                      <WalletButton icon="🦊" label="MetaMask" onClick={() => handleConnect('metamask')} />
                      <WalletButton icon="🔗" label="WalletConnect" onClick={() => handleConnect('walletconnect')} />

                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full h-px" style={{ background: 'rgba(218,241,222,0.1)' }} />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-2 text-xs font-inter" style={{ background: 'transparent', color: '#8EB69B' }}>
                            or
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConnect('demo')}
                        className="btn-outline w-full text-sm"
                      >
                        Continue in Demo Mode
                      </button>
                    </>
                  )}
                </div>

                <p className="text-center font-inter text-xs mt-6" style={{ color: '#8EB69B' }}>
                  Your wallet address is your identity. No password needed.
                </p>
              </motion.div>
            )}

            {/* Step 1: Profile */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepBar step={1} />
                <h2 className="font-sora font-semibold text-lg mb-6" style={{ color: '#DAF1DE' }}>
                  Who are you?
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
                      Display Name
                    </label>
                    <input
                      className="vault-input"
                      placeholder="How should we call you?"
                      value={displayName}
                      onChange={(e) => setDN(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleProfileNext()}
                    />
                  </div>

                  <div>
                    <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
                      Profile Photo (optional)
                    </label>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handlePhotoChange}
                    />
                    <div
                      className="w-full py-6 rounded-xl border-dashed border-2 flex flex-col items-center gap-2 cursor-pointer transition-all"
                      style={{ borderColor: photoPreview ? 'rgba(142,182,155,0.6)' : 'rgba(218,241,222,0.2)' }}
                      onClick={() => photoInputRef.current?.click()}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.45)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = photoPreview ? 'rgba(142,182,155,0.6)' : 'rgba(218,241,222,0.2)')}
                    >
                      {photoPreview ? (
                        <>
                          <img
                            src={photoPreview}
                            alt="profile"
                            className="w-16 h-16 rounded-full object-cover"
                            style={{ border: '2px solid rgba(142,182,155,0.5)' }}
                          />
                          <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                            Photo set — click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">📸</span>
                          <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                            Click to upload a profile photo
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button onClick={handleProfileNext} className="btn-primary w-full">
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: PIN */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepBar step={2} />
                <h2 className="font-sora font-semibold text-lg mb-2" style={{ color: '#DAF1DE' }}>
                  Set your Private Safe PIN
                </h2>
                <p className="font-inter text-xs mb-6" style={{ color: '#8EB69B' }}>
                  6-digit PIN for an extra encryption layer on your Private Safe. Never stored on any server.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
                      6-digit PIN
                    </label>
                    <input
                      className="vault-input text-center tracking-widest text-xl"
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>

                  <div>
                    <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
                      Confirm PIN
                    </label>
                    <input
                      className="vault-input text-center tracking-widest text-xl"
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && handlePinNext()}
                    />
                  </div>

                  <button onClick={handlePinNext} className="btn-primary w-full">
                    Enter My Vault
                  </button>

                  <button
                    onClick={() => { completeOnboarding(); navigate('/dashboard') }}
                    className="w-full text-xs font-inter text-center py-2 transition-opacity hover:opacity-70"
                    style={{ color: '#8EB69B' }}
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
