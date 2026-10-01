import { useAppStore } from '@/store/useAppStore'

// RGB triplets for <canvas> drawing and framer-motion values, neither of which
// can use CSS variables. Mirrors the --c-0..5 tokens in index.css (deep → mint
// is --c-0 → --c-5).
const PALETTES = {
  dark: {
    deep:   '5,31,32',
    moss:   '11,43,38',
    pine:   '22,56,50',
    forest: '35,83,71',
    sage:   '142,182,155',
    mint:   '218,241,222',
  },
  light: {
    deep:   '185,204,191',
    moss:   '238,244,240',
    pine:   '211,224,215',
    forest: '85,117,98',
    sage:   '40,79,62',
    mint:   '11,43,38',
  },
  gold: {
    deep:   '11,10,8',
    moss:   '23,20,14',
    pine:   '36,30,19',
    forest: '107,90,53',
    sage:   '212,175,55',
    mint:   '246,238,220',
  },
}

export const THEMES = Object.keys(PALETTES)

// Glows and full-strength particles read as smudges on a light background:
// soften the canvas and drop shadowBlur entirely in light mode.
// The same context is handed back after a theme switch, so other themes undo it.
export function tameForLight(ctx, P, alpha = 0.45) {
  if (!P.light) {
    delete ctx.shadowBlur // drop the own-property override, restoring the native setter
    ctx.globalAlpha = 1
    return
  }
  ctx.globalAlpha = alpha
  Object.defineProperty(ctx, 'shadowBlur', { get: () => 0, set: () => {}, configurable: true })
}

export function palette(theme) {
  const p = PALETTES[theme] || PALETTES.dark
  const arr = (s) => s.split(',').map(Number)
  return {
    ...p,
    light: theme === 'light',
    deepArr: arr(p.deep), mossArr: arr(p.moss), pineArr: arr(p.pine),
    forestArr: arr(p.forest), sageArr: arr(p.sage), mintArr: arr(p.mint),
  }
}

const ORDER = ['deep', 'moss', 'pine', 'forest', 'sage', 'mint']

// Token n (0–5) of the active theme as "r,g,b", for framer-motion props such as
// whileHover={{ boxShadow: `0 0 20px rgba(${tok(4)},0.2)` }}. framer-motion can't
// interpolate var() colours, so these are resolved at render time; a theme change
// re-renders the whole tree from App (nothing is memoised), picking them up.
export function tok(n) {
  return (PALETTES[useAppStore.getState().theme] || PALETTES.dark)[ORDER[n]]
}
