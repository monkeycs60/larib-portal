import type { CSSProperties } from 'react'

function parseHexColor(color: string) {
  const value = color.replace('#', '')
  if (value.length !== 6) return null
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

const toHex = (channel: number) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')

export function mixWithWhite(hex: string, ratio: number) {
  const parsed = parseHexColor(hex)
  if (!parsed) return hex
  const mix = (channel: number) => channel + (255 - channel) * ratio
  return `#${toHex(mix(parsed.r))}${toHex(mix(parsed.g))}${toHex(mix(parsed.b))}`
}

export function mixWithBlack(hex: string, ratio: number) {
  const parsed = parseHexColor(hex)
  if (!parsed) return hex
  const mix = (channel: number) => channel * (1 - ratio)
  return `#${toHex(mix(parsed.r))}${toHex(mix(parsed.g))}${toHex(mix(parsed.b))}`
}

// Pastel background with a darker, saturated label color for any tag color.
export function tagChipStyle(hex: string): CSSProperties {
  if (!parseHexColor(hex)) {
    return { backgroundColor: '#eceff3', color: '#363f4c', borderColor: '#dde2e9' }
  }
  return {
    backgroundColor: mixWithWhite(hex, 0.85),
    color: mixWithBlack(hex, 0.35),
    borderColor: mixWithWhite(hex, 0.6),
  }
}
