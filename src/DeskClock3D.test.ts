import { expect, test } from 'bun:test'
import { clockReading } from './DeskClock3D'

test('clock uses local time, pads hours and minutes across midnight', () => {
  const before = clockReading(new Date(2026, 8, 30, 23, 59))
  const after = clockReading(new Date(2026, 9, 1, 0, 3))
  expect(before.hours + ':' + before.minutes).toBe('23:59')
  expect(after).toEqual({ hours: '00', minutes: '03' })
})
