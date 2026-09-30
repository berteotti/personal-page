export const itemIds = ['note', 'photo-01', 'postcard', 'duck', 'clock', 'calendar', 'notebook'] as const
export type ItemId = typeof itemIds[number]
export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Layout = { positions: Record<ItemId, Point>; order: ItemId[] }
export type Viewport = 'desktop' | 'mobile'

const defaults: Record<Viewport, Layout> = {
  desktop: {
    positions: {
      note: { x: 0.15, y: 0.58 },
      'photo-01': { x: 0.725, y: 0.27 },
      postcard: { x: 0.905, y: 0.705 },
      duck: { x: 0.505, y: 0.025 },
      clock: { x: 1, y: 0.005 },
      calendar: { x: 0, y: 0.02 },
      notebook: { x: 0.51, y: 0.65 },
    },
    order: [...itemIds],
  },
  mobile: {
    positions: {
      note: { x: 0.5, y: 0.015 },
      'photo-01': { x: 0.04, y: 0.35 },
      postcard: { x: 0.65, y: 0.73 },
      duck: { x: 0.78, y: 0.34 },
      clock: { x: 0.55, y: 0.49 },
      calendar: { x: 0.55, y: 0.61 },
      notebook: { x: 0.45, y: 0.93 },
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

  if (viewport === 'mobile') {
    const note = sizes.note
    const photo = sizes['photo-01']
    const gap = Math.min(40, Math.max(16, (area.height - note.height - photo.height - sizes.postcard.height - 156) / 2))
    const edge = Math.max(8, area.width * 0.025)
    const noteTop = 16
    const photoTop = noteTop + note.height + gap
    const clockTop = photoTop + Math.max(photo.height, sizes.duck.height) + gap
    const calendarTop = clockTop + sizes.clock.height + gap
    const secondTop = calendarTop + sizes.calendar.height + gap
    place('note', (area.width - note.width) / 2, noteTop)
    place('photo-01', edge, photoTop)
    place('duck', area.width - sizes.duck.width - edge, noteTop + note.height + gap / 2)
    place('clock', (area.width - sizes.clock.width) / 2, clockTop)
    place('calendar', (area.width - sizes.calendar.width) / 2, calendarTop)
    place('postcard', (area.width - sizes.postcard.width) / 2, secondTop)
    place('notebook', (area.width - sizes.notebook.width) / 2, secondTop + sizes.postcard.height + gap)
  }
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
