export const itemIds = ['note', 'photo-01', 'postcard', 'duck', 'clock', 'calendar', 'notebook', 'tv', 'bookstand'] as const
export type ItemId = typeof itemIds[number]
export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Layout = { positions: Record<ItemId, Point>; order: ItemId[] }
export type Viewport = 'desktop' | 'mobile'

const defaults: Record<Viewport, Layout> = {
  desktop: {
    positions: {
      note: { x: 0.13, y: 0.64 },
      'photo-01': { x: 0.9, y: 0.33 },
      postcard: { x: 0.87, y: 0.83 },
      duck: { x: 0.507, y: 0.07 },
      clock: { x: 1, y: 0.005 },
      calendar: { x: 0, y: 0.02 },
      notebook: { x: 0.60, y: 0.38 },
      tv: { x: 0.215, y: 0.005 },
      bookstand: { x: 0.787, y: 0.025 },
    },
    order: [...itemIds],
  },
  mobile: {
    positions: {
      note: { x: 0.5, y: 0.16 },
      'photo-01': { x: 0.18, y: 0.5 },
      postcard: { x: 0.5, y: 0.96 },
      duck: { x: 0.84, y: 0.48 },
      clock: { x: 0.96, y: 0.017 },
      calendar: { x: 0.04, y: 0.017 },
      notebook: { x: 0.48, y: 0.7 },
      tv: { x: 0.17, y: 0.81 },
      bookstand: { x: 0.83, y: 0.81 },
    },
    order: [...itemIds],
  },
}

export const clamp = (n: number) => Math.min(1, Math.max(0, n))

export function defaultLayout(viewport: Viewport): Layout {
  const layout = defaults[viewport]
  return { positions: Object.fromEntries(itemIds.map(id => [id, { ...layout.positions[id] }])) as Layout['positions'], order: [...layout.order] }
}

export function resetLayout(viewport: Viewport, area: Size, sizes: Record<ItemId, Size>): Layout {
  const layout = defaultLayout(viewport)
  if (viewport === 'desktop') return layout
  const place = (id: ItemId, x: number, y: number) => {
    layout.positions[id] = normalizePosition({ x, y }, area, sizes[id])
  }

  const gap = area.width * 0.11
  const edge = area.width * 0.025
  const noteTop = 24 + Math.max(sizes.calendar.height, sizes.clock.height) + gap * 0.55
  const photoTop = noteTop + sizes.note.height + gap
  const notebookTop = photoTop + Math.max(sizes['photo-01'].height, sizes.duck.height) + gap * 1.5
  place('calendar', edge, 24)
  place('clock', area.width - sizes.clock.width - edge, 24)
  place('note', (area.width - sizes.note.width) / 2, noteTop)
  place('photo-01', area.width * 0.12, photoTop)
  place('duck', area.width - sizes.duck.width - area.width * 0.12, photoTop + gap / 2)
  place('notebook', (area.width - sizes.notebook.width) * 0.48, notebookTop)
  const tvTop = notebookTop + sizes.notebook.height + gap * 1.75
  const rowInset = Math.min(area.width * 0.12, (area.width - sizes.tv.width - sizes.bookstand.width) / 3)
  place('tv', rowInset, tvTop)
  place('bookstand', area.width - sizes.bookstand.width - rowInset, tvTop)
  place('postcard', (area.width - sizes.postcard.width) / 2, tvTop + Math.max(sizes.tv.height, sizes.bookstand.height) + gap * 3)
  return layout
}

export function positionFor(point: Point, area: { width: number; height: number }, item: { width: number; height: number }): Point {
  return {
    x: clamp(point.x) * Math.max(0, area.width - item.width),
    y: clamp(point.y) * Math.max(0, area.height - item.height),
  }
}

export function normalizePosition(point: Point, area: { width: number; height: number }, item: { width: number; height: number }): Point {
  return {
    x: clamp(point.x / Math.max(1, area.width - item.width)),
    y: clamp(point.y / Math.max(1, area.height - item.height)),
  }
}

export function parseLayout(value: string | null, viewport: Viewport): Layout {
  if (!value) return defaultLayout(viewport)
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return defaultLayout(viewport)
    const candidate = parsed as Partial<Layout>
    if (!candidate.positions || !candidate.order || !Array.isArray(candidate.order)) return defaultLayout(viewport)
    const savedIds = itemIds.filter(id => candidate.order?.includes(id))
    if (!['note', 'photo-01', 'postcard'].every(id => candidate.order?.includes(id as ItemId)) || candidate.order.length !== savedIds.length) return defaultLayout(viewport)
    const positions = defaultLayout(viewport).positions
    for (const id of savedIds) {
      const point = candidate.positions[id]
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return defaultLayout(viewport)
      positions[id] = { x: clamp(point.x), y: clamp(point.y) }
    }
    return { positions, order: [...candidate.order, ...itemIds.filter(id => !savedIds.includes(id))] }
  } catch {
    return defaultLayout(viewport)
  }
}
