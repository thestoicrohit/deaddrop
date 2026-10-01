// RGB triplets for <canvas> drawing, which can't read CSS variables.
// Mirrors the --c-*-rgb tokens in index.css; canvases re-init on theme change.
const DARK = {
  deep:   '5,31,32',
  moss:   '11,43,38',
  pine:   '22,56,50',
  forest: '35,83,71',
  sage:   '142,182,155',
  mint:   '218,241,222',
}

const LIGHT = {
  deep:   '244,249,245',
  moss:   '230,240,232',
  pine:   '212,228,216',
  forest: '127,159,138',
  sage:   '61,107,87',
  mint:   '11,43,38',
}

// Glows and full-strength particles read as smudges on a light background:
// soften the canvas and drop shadowBlur entirely in light mode.
// The same context is handed back after a theme switch, so dark mode undoes it.
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
  const p = theme === 'light' ? LIGHT : DARK
  const arr = (s) => s.split(',').map(Number)
  return {
    ...p,
    light: theme === 'light',
    deepArr: arr(p.deep), mossArr: arr(p.moss), pineArr: arr(p.pine),
    forestArr: arr(p.forest), sageArr: arr(p.sage), mintArr: arr(p.mint),
  }
}
