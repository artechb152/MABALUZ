// Central visual tokens. Tailwind classes are generated from the same values
// in tailwind.config.js — keep both in sync when changing a token.
//
// TWO palettes only:
//   App shell  = warm monochrome + a single indigo accent (calm, neutral).
//   Schedule   = five rich colors, used ONLY inside calendar blocks (white text).
// Status meaning (danger/warning/success) reuses three of the rich colors, but
// only as thin borders / icons / text — never as filled panels.
export const theme = {
  background: '#FFFCF2', // paper / cream
  panel: 'rgba(255,252,242,0.82)',
  panelSolid: '#FFFFFF',
  primary: '#4F46E5', // indigo accent
  primarySoft: '#E9E7FC', // light indigo
  primaryHover: '#3F37C9',
  border: '#CCC5B9', // warm stone
  text: '#252422', // near-black ink
  mutedText: '#403D39', // graphite
  danger: '#C81D4B', // crimson (thin-accent only)
  warning: '#CC4800', // burnt orange (thin-accent only)
  success: '#0F766E', // teal (thin-accent only)
  neutralBlock: '#F3F0E9' // faint stone tint
} as const

// The five rich schedule-block colors. Nothing outside a calendar block should
// use these as a fill.
export const blockPalette = ['#C81D4B', '#CC4800', '#0F766E', '#185FA5', '#7209B7'] as const

// Default block color per event type (commander may override from blockPalette).
export const eventTypeColors: Record<string, string> = {
  SHARED: '#7209B7', // purple
  PEAK_DAY: '#CC4800', // orange
  GUEST_LECTURE: '#C81D4B', // crimson
  FLEXIBLE_CONTENT: '#185FA5', // blue
  MEAL_BREAK: '#0F766E', // teal
  COMMANDER_TIME: '#7209B7', // purple
  FORMATION: '#CC4800', // orange
  TEAM_ACTIVITY: '#C81D4B', // crimson
  CUSTOM: '#185FA5' // blue
}
