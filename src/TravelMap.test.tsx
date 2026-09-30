import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TravelMap } from './TravelMap'
import { MemoryRouter } from 'react-router'
import { Detail } from './site'
import { countries } from './content'

test('Portugal is marked as the current base, separate from visited countries', () => {
  const html = renderToStaticMarkup(<TravelMap />)
  expect(html).toMatch(/data-country="PRT" class="map-country is-based"/)
  expect(html).toContain('Portugal, currently based')
  expect(html).toContain('Based in Portugal')
  expect(html).toMatch(/data-country="ITA" class="map-country is-visited"/)
})

test('travel detail includes a labeled passport stamp for every visited country', () => {
  const html = renderToStaticMarkup(<MemoryRouter><Detail kind="travels" /></MemoryRouter>)
  for (const country of countries) {
    expect(html).toContain(`aria-label="${country.name} passport stamp"`)
    expect(html).toContain(`class="stamp-caption">${country.name}</span>`)
  }
})
