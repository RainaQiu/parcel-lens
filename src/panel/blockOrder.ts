export const PANEL_BLOCKS = [
  { id: 'score', label: 'Development Ease Score' },
  { id: 'highlights', label: 'Parcel highlights' },
  { id: 'parcel', label: 'Parcel details' },
  { id: 'owner', label: 'Owner information' },
  { id: 'sales', label: 'Property sales & value' },
  { id: 'zoning', label: 'Zoning, land use & vacancy' },
  { id: 'geo', label: 'Geographic information' },
  { id: 'legal', label: 'Plat, block, lot, legal data' },
] as const

export type PanelBlockId = (typeof PANEL_BLOCKS)[number]['id']

export const DEFAULT_BLOCK_ORDER: PanelBlockId[] = PANEL_BLOCKS.map((block) => block.id)

const STORAGE_KEY = 'parcel-lens:block-order'

export function isPanelBlockId(value: string): value is PanelBlockId {
  return PANEL_BLOCKS.some((block) => block.id === value)
}

export function normalizeOrder(stored: unknown): PanelBlockId[] {
  const seen = new Set<PanelBlockId>()
  const next: PanelBlockId[] = []
  if (Array.isArray(stored)) {
    for (const item of stored) {
      if (typeof item === 'string' && isPanelBlockId(item) && !seen.has(item)) {
        seen.add(item)
        next.push(item)
      }
    }
  }
  for (const id of DEFAULT_BLOCK_ORDER) {
    if (!seen.has(id)) next.push(id)
  }
  return next
}

export function loadBlockOrder(): PanelBlockId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_BLOCK_ORDER]
    return normalizeOrder(JSON.parse(raw) as unknown)
  } catch {
    return [...DEFAULT_BLOCK_ORDER]
  }
}

export function saveBlockOrder(order: PanelBlockId[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeOrder(order)))
}

export function moveItem<T>(order: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= order.length ||
    to >= order.length
  ) {
    return order
  }
  const next = [...order]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function moveBlock(
  order: PanelBlockId[],
  id: PanelBlockId,
  delta: number,
): PanelBlockId[] {
  const from = order.indexOf(id)
  if (from < 0) return order
  return moveItem(order, from, from + delta)
}
