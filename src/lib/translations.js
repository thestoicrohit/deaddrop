export const t = {
  en: {
    tagline: 'Some things are too precious for the internet. Keep them yours.',
    watching: 'Make sure no one is watching.',
    connectWallet: 'Connect Wallet',
    createAccount: 'Create Account',
    yourKeys: 'Your keys. Your memories. No one else.',
    welcomeBack: 'Welcome back. Your vault is safe.',
    goToProfile: 'Go to My Profile',
    openMemorySpace: 'Open memory space',
    checkLegacy: 'Check legacy settings',
    navbar: {
      profiles: 'Profiles',
      memorySpace: 'Memory Space',
      privateSafe: 'Private Safe',
      legacy: 'Legacy',
      about: 'About',
    },
    profiles: {
      title: 'Your Circles',
      create: 'Create New Profile',
      join: 'Join a Profile',
      empty: "You haven't created any circles yet. Start with your family.",
      lastActive: 'Last active',
      members: 'members',
    },
    safe: {
      title: 'Private Safe',
      subtitle: 'Only you can enter. Everything here is encrypted.',
      warning: 'This vault disappears with you unless you assign a legacy beneficiary.',
      assignLegacy: 'Assign Legacy Beneficiary',
      sections: {
        keys: 'Crypto Keys & Seed Phrases',
        docs: 'Private Documents',
        letters: 'Private Letters',
        voice: 'Private Voice Notes',
        photos: 'Private Photos & Videos',
        passwords: 'Password Vault',
      },
    },
    memory: {
      title: 'Memory Space',
      subtitle: "Every moment you’ve lived deserves to be kept.",
      createCapsule: 'Create Capsule',
    },
    legacy: {
      title: 'Your legacy, on your terms.',
    },
    ai: {
      title: 'Vault Assistant',
      placeholder: 'Ask me anything about your vault...',
      suggested: ['Find memories from 2022', "What's in my family vault?", 'Generate my memory portrait'],
    },
    claim: {
      title: 'Someone left something for you.',
      subtitle: 'Enter the wallet address of the person who entrusted you.',
    },
  },
  hi: {
    tagline: 'कुछ चीज़ें इंटरनेट के लिए बहुत कीमती हैं। इन्हें अपना रखें।',
    watching: 'सुनिश्चित करें कि कोई देख नहीं रहा।',
    connectWallet: 'वॉलेट जोड़ें',
    createAccount: 'खाता बनाएं',
    yourKeys: 'आपकी चाबियाँ। आपकी यादें। कोई और नहीं।',
    welcomeBack: 'वापस आए। आपका वॉल्ट सुरक्षित है।',
    goToProfile: 'मेरी प्रोफ़ाइल पर जाएं',
    openMemorySpace: 'मेमोरी स्पेस खोलें',
    checkLegacy: 'विरासत सेटिंग जांचें',
    navbar: {
      profiles: 'सर्कल',
      memorySpace: 'मेमोरी स्पेस',
      privateSafe: 'प्राइवेट सेफ',
      legacy: 'विरासत',
      about: 'परिचय',
    },
    profiles: {
      title: 'आपके सर्कल',
      create: 'नया सर्कल बनाएं',
      join: 'सर्कल में शामिल हों',
      empty: 'अभी तक कोई सर्कल नहीं बना। अपने परिवार से शुरू करें।',
      lastActive: 'आखरी बार सक्रिय',
      members: 'सदस्य',
    },
    safe: {
      title: 'प्राइवेट सेफ',
      subtitle: 'केवल आप ही प्रवेश कर सकते हैं। सब एन्क्रिप्टेड है।',
      warning: 'यह वॉल्ट आपके साथ गायब हो जाएगा जब तक आप कोई उत्तराधिकारी नहीं बताते।',
      assignLegacy: 'विरासत उत्तराधिकारी नियुक्त करें',
      sections: {
        keys: 'क्रिप्टो कीज़ और सीड फ्रेज़',
        docs: 'प्राइवेट दस्तावेज़',
        letters: 'प्राइवेट पत्र',
        voice: 'प्राइवेट वॉयस नोट्स',
        photos: 'प्राइवेट फोटो और वीडियो',
        passwords: 'पासवर्ड वॉल्ट',
      },
    },
    memory: {
      title: 'मेमोरी स्पेस',
      subtitle: 'आपने जो हर पल जिया है वो सहेजने लायक है।',
      createCapsule: 'कैप्सूल बनाएं',
    },
    legacy: {
      title: 'आपकी विरासत, आपकी शर्तों पर।',
    },
    ai: {
      title: 'वॉल्ट सहायक',
      placeholder: 'अपने वॉल्ट के बारे में कुछ भी पूछें...',
      suggested: ['2022 की यादें खोजें', 'मेरे परिवार के वॉल्ट में क्या है?', 'मेरा मेमोरी पोर्ट्रेट बनाएं'],
    },
    claim: {
      title: 'किसी ने आपके लिए कुछ छोड़ा है।',
      subtitle: 'उस व्यक्ति का वॉलेट पता दर्ज करें जिसने आप पर भरोसा किया।',
    },
  },
}

export const useTranslation = (lang) => (key) => {
  const keys = key.split('.')
  let val = t[lang] || t['en']
  for (const k of keys) {
    val = val?.[k]
    if (!val) return key
  }
  return val
}
