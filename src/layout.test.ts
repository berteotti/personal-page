import { expect, test } from 'bun:test'
import { defaultLayout, normalizePosition, parseLayout, positionFor, resetLayout } from './layout'

test('stored layout is validated and clamped to the desk', () => {
  const valid = defaultLayout('desktop')
  valid.positions.note = { x: 2, y: -1 }
  expect(parseLayout(JSON.stringify(valid), 'desktop').positions.note).toEqual({ x: 1, y: 0 })
  expect(parseLayout('{broken', 'desktop')).toEqual(defaultLayout('desktop'))
  expect(parseLayout(JSON.stringify({ ...valid, order: ['note'] }), 'desktop')).toEqual(defaultLayout('desktop'))
  expect(positionFor({ x: 2, y: -1 }, { width: 100, height: 80 }, { width: 30, height: 20 })).toEqual({ x: 70, y: 0 })
  expect(normalizePosition({ x: 120, y: -3 }, { width: 100, height: 80 }, { width: 30, height: 20 })).toEqual({ x: 1, y: 0 })
})

test('old three-object layouts keep their positions when the duck is added', () => {
  const old = defaultLayout('desktop')
  old.positions.note = { x: 0.72, y: 0.18 }
  old.order = old.order.filter(id => id !== 'duck')
  const positions = Object.fromEntries(Object.entries(old.positions).filter(([id]) => id !== 'duck'))
  const restored = parseLayout(JSON.stringify({ positions, order: old.order }), 'desktop')
  expect(restored.positions.note).toEqual({ x: 0.72, y: 0.18 })
  expect(restored.positions.duck).toEqual(defaultLayout('desktop').positions.duck)
  expect(restored.order).toEqual([...old.order, 'duck'])
})

test('reset matches the desktop arrangement and opens mobile with the clock and books in a row', () => {
  const sizes = {
    note: { width: 310, height: 650 },
    'photo-01': { width: 160, height: 203 },
    postcard: { width: 300, height: 181 },
    duck: { width: 120, height: 120 },
    banana: { width: 100, height: 100 },
    projects: { width: 105, height: 110 },
    github: { width: 100, height: 100 },
    clock: { width: 220, height: 147 },
    notebook: { width: 210, height: 284 },
    bookstand: { width: 220, height: 116 },
  }
  const area = { width: 768, height: 800 }
  const layout = resetLayout('desktop', area, sizes)
  expect(layout).toEqual(defaultLayout('desktop'))
  // One back row, left to right: clock, banana and duck, GitHub and Projects, books.
  const backRow = ['clock', 'banana', 'duck', 'github', 'projects', 'bookstand'] as const
  for (let i = 1; i < backRow.length; i++) {
    expect(layout.positions[backRow[i]].x).toBeGreaterThan(layout.positions[backRow[i - 1]].x)
    expect(layout.positions[backRow[i]].y).toBeLessThan(layout.positions.note.y)
  }
  expect(layout.positions.notebook.y).toBeGreaterThan(layout.positions.duck.y)
  const photo = positionFor(layout.positions['photo-01'], area, sizes['photo-01'])
  expect(photo.x).toBeGreaterThan(positionFor(layout.positions.note, area, sizes.note).x + sizes.note.width)
  expect(Object.keys(layout.positions).sort()).toEqual(['banana', 'bookstand', 'clock', 'duck', 'github', 'note', 'notebook', 'photo-01', 'postcard', 'projects'])

  const mobileArea = { width: 350, height: 2000 }
  const mobileSizes = { ...sizes, 'photo-01': { width: 119, height: 151 }, duck: { width: 84, height: 84 }, banana: { width: 63, height: 63 }, clock: { width: 140, height: 93 }, bookstand: { width: 140, height: 112 } }
  const mobile = resetLayout('mobile', mobileArea, mobileSizes).positions
  const at = (id: keyof typeof mobile) => positionFor(mobile[id], mobileArea, mobileSizes[id])
  expect(at('bookstand').y + mobileSizes.bookstand.height).toBeCloseTo(at('clock').y + mobileSizes.clock.height)
  expect(at('clock').x + mobileSizes.clock.width).toBeLessThan(at('bookstand').x)
  expect(at('note').y).toBeGreaterThan(at('bookstand').y + mobileSizes.bookstand.height)
  expect(at('note').y).toBeGreaterThan(at('clock').y + mobileSizes.clock.height)
  expect(at('photo-01').y).toBeGreaterThan(at('note').y + mobileSizes.note.height)
  expect(at('photo-01').x + mobileSizes['photo-01'].width).toBeLessThan(at('duck').x)
  expect(at('banana').x + mobileSizes.banana.width).toBeCloseTo(at('duck').x)
  expect(at('banana').x).toBeGreaterThanOrEqual(at('photo-01').x + mobileSizes['photo-01'].width)
  expect(at('banana').y).toEqual(at('duck').y)
  expect(at('notebook').y).toBeGreaterThan(at('photo-01').y + mobileSizes['photo-01'].height)
  expect(at('projects').x).toBeGreaterThan(at('notebook').x + mobileSizes.notebook.width)
  expect(at('github').y).toBeGreaterThan(at('projects').y + mobileSizes.projects.height)
  expect(at('postcard').y).toBeGreaterThan(at('notebook').y + mobileSizes.notebook.height)
  expect(at('postcard').y).toBeGreaterThan(at('github').y + mobileSizes.github.height)
  for (const id of Object.keys(mobile) as (keyof typeof mobile)[]) {
    expect(at(id).x + mobileSizes[id].width).toBeLessThanOrEqual(mobileArea.width)
    expect(at(id).y + mobileSizes[id].height).toBeLessThanOrEqual(mobileArea.height)
  }
})

test('retiring the calendar and television keeps the rest of a saved desk', () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    const saved = defaultLayout(viewport)
    saved.positions.note = { x: 0.2, y: 0.3 }
    const order = [...saved.order, 'calendar', 'tv']
    const positions = { ...saved.positions, calendar: { x: 0, y: 0 }, tv: { x: 0.2, y: 0 } }
    const restored = parseLayout(JSON.stringify({ positions, order }), viewport)
    expect(restored.positions).toEqual(saved.positions)
    expect(restored.order).toEqual(saved.order)
  }
})

test('adding the notebook preserves existing saved positions and stacking order', () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    const saved = defaultLayout(viewport)
    saved.positions.note = { x: 0.2, y: 0.3 }
    const order = saved.order.filter(id => id !== 'notebook')
    const positions = Object.fromEntries(order.map(id => [id, saved.positions[id]]))
    const restored = parseLayout(JSON.stringify({ positions, order }), viewport)
    expect(restored.positions.note).toEqual(saved.positions.note)
    expect(restored.positions.notebook).toEqual(defaultLayout(viewport).positions.notebook)
    expect(restored.order).toEqual([...order, 'notebook'])
  }
})

test('adding the clock preserves saved three- and four-object desks', () => {
  for (const includeDuck of [false, true]) {
    const saved = defaultLayout('desktop')
    saved.positions.note = { x: 0.72, y: 0.18 }
    saved.order = saved.order.filter(id => id !== 'clock' && (includeDuck || id !== 'duck'))
    const positions = Object.fromEntries(saved.order.map(id => [id, saved.positions[id]]))
    const restored = parseLayout(JSON.stringify({ positions, order: saved.order }), 'desktop')
    expect(restored.positions.note).toEqual(saved.positions.note)
    expect(restored.positions.clock).toEqual(defaultLayout('desktop').positions.clock)
    expect(restored.order).toEqual([...saved.order, ...(includeDuck ? [] : ['duck'] as const), 'clock'])
  }
})

test('adding the book stand preserves saved positions and stacking order', () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    const saved = defaultLayout(viewport)
    saved.positions.note = { x: 0.2, y: 0.3 }
    const order = saved.order.filter(id => id !== 'bookstand')
    const positions = Object.fromEntries(order.map(id => [id, saved.positions[id]]))
    const restored = parseLayout(JSON.stringify({ positions, order }), viewport)
    expect(restored.positions.note).toEqual(saved.positions.note)
    expect(restored.positions.bookstand).toEqual(defaultLayout(viewport).positions.bookstand)
    expect(restored.order).toEqual([...order, 'bookstand'])
  }
})

test('adding GitHub preserves existing saved positions and stacking order', () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    const saved = defaultLayout(viewport)
    saved.positions.note = { x: 0.2, y: 0.3 }
    const order = saved.order.filter(id => id !== 'github')
    const positions = Object.fromEntries(order.map(id => [id, saved.positions[id]]))
    const restored = parseLayout(JSON.stringify({ positions, order }), viewport)
    expect(restored.positions.note).toEqual(saved.positions.note)
    expect(restored.positions.github).toEqual(defaultLayout(viewport).positions.github)
    expect(restored.order).toEqual([...order, 'github'])
  }
})

test('adding BananaSplit preserves saved desks and defaults to the left of the duck', () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    const saved = defaultLayout(viewport)
    saved.positions.note = { x: 0.2, y: 0.3 }
    const order = saved.order.filter(id => id !== 'banana')
    const positions = Object.fromEntries(order.map(id => [id, saved.positions[id]]))
    const restored = parseLayout(JSON.stringify({ positions, order }), viewport)
    expect(restored.positions.note).toEqual(saved.positions.note)
    expect(restored.positions.banana.x).toBeLessThan(restored.positions.duck.x)
    expect(restored.positions.banana.y).toEqual(restored.positions.duck.y)
    expect(restored.order).toEqual([...order, 'banana'])
  }
})
