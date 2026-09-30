import { expect, test } from 'bun:test'
import { calendarReading } from './DeskCalendar3D'

test('calendar uses local dates, including leap day and year rollover', () => {
  expect(calendarReading(new Date(2028, 1, 29, 23, 59))).toEqual({ month: 'FEB', day: '29' })
  expect(calendarReading(new Date(2028, 2, 1))).toEqual({ month: 'MAR', day: '01' })
  expect(calendarReading(new Date(2026, 11, 31, 23, 59))).toEqual({ month: 'DEC', day: '31' })
  expect(calendarReading(new Date(2027, 0, 1))).toEqual({ month: 'JAN', day: '01' })
})
