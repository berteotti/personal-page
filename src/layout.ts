export const itemIds = ['note', 'photo-01', 'postcard', 'duck', 'clock', 'notebook', 'bookstand', 'banana', 'projects', 'github'] as const
// Objects that were once on the desk; saved layouts drop them instead of resetting.
const retiredIds = ['calendar', 'tv']
export type ItemId = typeof itemIds[number]
export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Layout = { positions: Record<ItemId, Point>; order: ItemId[] }
export type Viewport = 'desktop' | 'mobile'

const defaults: Record<Viewport, Layout> = {
  desktop: {
    positions: {
      note: { x: 0.08, y: 0.62 },
      'photo-01': { x: 0.9, y: 0.34 },
      postcard: { x: 0.87, y: 0.83 },
      duck: { x: 0.419, y: 0.07 },
      banana: { x: 0.316, y: 0.07 },
      projects: { x: 0.737, y: 0.046 },
      github: { x: 0.6, y: 0.07 },
      clock: { x: 0.02, y: 0.005 },
      notebook: { x: 0.5, y: 0.63 },
      bookstand: { x: 0.985, y: 0.02 },
    },
    order: [...itemIds],
  },
  mobile: {
    positions: {
      note: { x: 0.5, y: 0.16 },
      'photo-01': { x: 0.18, y: 0.5 },
      postcard: { x: 0.5, y: 0.96 },
      duck: { x: 0.893, y: 0.48 },
      banana: { x: 0.61, y: 0.48 },
      projects: { x: 0.9, y: 0.61 },
      github: { x: 0.9, y: 0.70 },
      clock: { x: 0.04, y: 0.017 },
      notebook: { x: 0.48, y: 0.7 },
      bookstand: { x: 0.96, y: 0.02 },
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
  const backRow = Math.max(sizes.clock.height, sizes.bookstand.height)
  const noteTop = 24 + backRow + gap * 0.55
  const photoTop = noteTop + sizes.note.height + gap
  const notebookTop = photoTop + Math.max(sizes['photo-01'].height, sizes.duck.height) + gap * 1.5
  // The clock and the books stand on the same line at the back of the desk.
  place('clock', edge, 24 + backRow - sizes.clock.height)
  place('bookstand', area.width - sizes.bookstand.width - edge, 24 + backRow - sizes.bookstand.height)
  place('note', (area.width - sizes.note.width) / 2, noteTop)
  place('photo-01', area.width * 0.12, photoTop)
  place('duck', area.width - sizes.duck.width - area.width * 0.08, photoTop + gap / 2)
  place('banana', area.width - sizes.duck.width - area.width * 0.08 - sizes.banana.width, photoTop + gap / 2)
  place('notebook', edge + 8, notebookTop)
  place('projects', area.width - sizes.projects.width - edge - 8, notebookTop + gap)
  place('github', area.width - sizes.github.width - edge - 8, notebookTop + gap + sizes.projects.height + 24)
  const linksBottom = notebookTop + gap + sizes.projects.height + 24 + sizes.github.height
  place('postcard', (area.width - sizes.postcard.width) / 2, Math.max(notebookTop + sizes.notebook.height, linksBottom) + gap * 1.5)
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
    candidate.order = candidate.order.filter(id => !retiredIds.includes(id))
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
