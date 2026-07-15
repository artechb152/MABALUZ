// Central visual tokens. Tailwind classes are generated from the same values
// in tailwind.config.js — keep both in sync when changing a token.
//
// TWO palettes only:
//   App shell  = warm monochrome + a single indigo accent (calm, neutral).
//   Schedule   = five rich colors, used ONLY inside calendar blocks (white text).
// Status meaning (danger/warning/success) reuses three of the rich colors, but
// only as thin borders / icons / text — never as filled panels.
export const theme = {
  background: '#EFF1F6', // cool light grey canvas
  panel: 'rgba(255,255,255,0.75)',
  panelSolid: '#FFFFFF',
  primary: '#4F46E5', // indigo accent
  primarySoft: '#E9E7FC', // light indigo
  primaryHover: '#3F37C9',
  border: '#DCDFE7', // cool hairline
  text: '#22262F', // cool near-black ink
  mutedText: '#474C57', // cool graphite
  danger: '#C81D4B', // crimson (thin-accent only)
  warning: '#CC4800', // burnt orange (thin-accent only)
  success: '#0F766E', // teal (thin-accent only)
  neutralBlock: '#E6E9F0' // faint cool tint
} as const

// Schedule-block palette: bright, flat, saturated. Nothing outside a calendar
// block (or a prayer panel) should use these as a fill. Flat fills only — no
// gradients. The five seed colors are extended with same-vibe neighbours.
export const blockPalette = [
  '#ffbe0b', // amber
  '#fb5607', // orange
  '#ff006e', // magenta
  '#8338ec', // purple
  '#3a86ff', // blue
  '#06d6a0', // mint
  '#f15bb5', // pink
  '#00bbf9', // sky
  '#9b5de5' // violet
] as const

// Default block color per event type (commander may override from blockPalette).
export const eventTypeColors: Record<string, string> = {
  SHARED: '#8338ec', // purple
  PEAK_DAY: '#fb5607', // orange
  GUEST_LECTURE: '#ff006e', // magenta
  FLEXIBLE_CONTENT: '#3a86ff', // blue
  MEAL_BREAK: '#06d6a0', // mint
  COMMANDER_TIME: '#9b5de5', // violet
  FORMATION: '#ffbe0b', // amber
  TEAM_ACTIVITY: '#f15bb5', // pink
  CUSTOM: '#00bbf9' // sky
}

/** Relative luminance (WCAG) of a hex color. */
function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const chan = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return (
    0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255)
  )
}

/**
 * Readable text color on a block fill. Bright colors (amber, mint, sky) take
 * ink; the rest take white. We never darken the fill to make white work.
 */
export function blockTextColor(hex: string): string {
  return luminance(hex) > 0.35 ? theme.text : '#FFFFFF'
}

/** Texture color (dots / slanted lines) that reads on a given block fill. */
export function blockTextureColor(hex: string): string {
  return luminance(hex) > 0.35 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.32)'
}
