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

test('desktop reset restores the default arrangement and mobile reset stacks the objects', () => {
  const sizes = {
    note: { width: 310, height: 650 },
    'photo-01': { width: 160, height: 203 },
    postcard: { width: 300, height: 181 },
    duck: { width: 120, height: 120 },
    clock: { width: 220, height: 147 },
    calendar: { width: 220, height: 147 },
    notebook: { width: 210, height: 284 },
  }
  const area = { width: 768, height: 800 }
  const layout = resetLayout('desktop', area, sizes)
  expect(layout).toEqual(defaultLayout('desktop'))
  expect(layout.positions.calendar).toEqual({ x: 0, y: 0.02 })
  expect(layout.positions.clock).toEqual({ x: 1, y: 0.005 })
  const photo = positionFor(layout.positions['photo-01'], area, sizes['photo-01'])
  expect(photo.x).toBeGreaterThan(positionFor(layout.positions.note, area, sizes.note).x + sizes.note.width)
  expect(Object.keys(layout.positions).sort()).toEqual(['calendar', 'clock', 'duck', 'note', 'notebook', 'photo-01', 'postcard'])

  const mobileArea = { width: 350, height: 2000 }
  const mobile = resetLayout('mobile', mobileArea, sizes).positions
  const first = positionFor(mobile['photo-01'], mobileArea, sizes['photo-01'])
  const duck = positionFor(mobile.duck, mobileArea, sizes.duck)
  const postcard = positionFor(mobile.postcard, mobileArea, sizes.postcard)
  const clock = positionFor(mobile.clock, mobileArea, sizes.clock)
  const calendar = positionFor(mobile.calendar, mobileArea, sizes.calendar)
  expect(first.x + sizes['photo-01'].width).toBeLessThan(duck.x)
  expect(postcard.y).toBeGreaterThan(first.y + sizes['photo-01'].height)
  expect(calendar.y).toBeGreaterThan(clock.y + sizes.clock.height)
  expect(postcard.y).toBeGreaterThan(calendar.y + sizes.calendar.height)
  expect(positionFor(mobile.notebook, mobileArea, sizes.notebook).y).toBeGreaterThan(postcard.y + sizes.postcard.height)
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

test('adding the calendar preserves existing desk positions and stacking order', () => {
  const saved = defaultLayout('desktop')
  saved.positions.clock = { x: 0.28, y: 0.42 }
  saved.order = saved.order.filter(id => id !== 'calendar')
  const positions = Object.fromEntries(saved.order.map(id => [id, saved.positions[id]]))
  const restored = parseLayout(JSON.stringify({ positions, order: saved.order }), 'desktop')
  expect(restored.positions.clock).toEqual(saved.positions.clock)
  expect(restored.positions.calendar).toEqual(defaultLayout('desktop').positions.calendar)
  expect(restored.order).toEqual([...saved.order, 'calendar'])
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
