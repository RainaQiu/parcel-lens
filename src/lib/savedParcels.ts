import { normalizePin } from './arcgis'

const pinPattern = /^(?:\d{4}[A-Z]\d{11}|\d{16})$/
export const SAVED_PINS_KEY = 'parcel-lens:saved-pins:v1'

export function canonicalPin(raw: string): string | null {
  const compact = raw.replace(/[-\s]/g, '').toUpperCase()
  return pinPattern.test(compact) ? normalizePin(compact) : null
}

export function addSavedPin(pins: string[], raw: string): string[] {
  const pin = canonicalPin(raw)
  if (!pin || pins.includes(pin) || pins.length >= 4) return pins
  return [...pins, pin]
}

export function removeSavedPin(pins: string[], raw: string): string[] {
  return pins.filter((pin) => pin !== canonicalPin(raw))
}

export function parseSavedPins(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(value)) return []
    return value.reduce<string[]>((pins, item) => typeof item === 'string' ? addSavedPin(pins, item) : pins, [])
  } catch {
    return []
  }
}

export type AppRoute = { page: 'map' } | { page: 'report'; pin: string } | { page: 'compare' } | { page: 'invalid' }

export function routeFromPath(pathname: string): AppRoute {
  if (pathname === '/') return { page: 'map' }
  if (pathname === '/compare') return { page: 'compare' }
  const match = pathname.match(/^\/parcels\/([^/]+)\/?$/)
  if (match) {
    const pin = canonicalPin(decodeURIComponent(match[1]))
    return pin ? { page: 'report', pin } : { page: 'invalid' }
  }
  return { page: 'invalid' }
}
