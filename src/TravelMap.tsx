import { useState } from 'react'
import { countries } from './content'
import world from './world-map.json'

// Natural Earth 1:110m, public domain; equirectangular projection, Antarctica omitted.
// Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
const visited = new Set(countries.map(country => country.id))
const based = 'PRT'

export function CountryStamps() {
  return <div className="stamps">{countries.map(country => <div key={country.id} className={`stamp-entry stamp-entry--${country.id}`}>
    <span className={`stamp stamp--${country.id}`} role="img" aria-label={`${country.name} passport stamp`}>
      <svg viewBox="0 0 150 110" aria-hidden="true">
        {country.id === 'AGO' ? <><ellipse cx="75" cy="55" rx="70" ry="49" /><ellipse cx="75" cy="55" rx="65" ry="44" /></>
          : country.id === 'BRA' ? <><path d="M22 5h106l17 18v64l-17 18H22L5 87V23Z" /><path d="M25 10h100l15 15v60l-15 15H25L10 85V25Z" /></>
          : <><rect x="5" y="10" width="140" height="90" rx="3" /><rect x="10" y="15" width="130" height="80" rx="1" /></>}
        <text className="stamp-name" x="75" y="33">{country.stamp}</text>
        <path className="stamp-rule" d="M27 41h96M27 75h96" />
        <text className="stamp-code" x="75" y="67">{country.id}</text>
        <text className="stamp-visited" x="75" y="89">Immigration · Entry</text>
        <path className="stamp-plane" d="m116 57 5-3-5-11 3-1 8 10 9-2 2 2-10 5-1 8-2 1-2-7-5 1Z" />
      </svg>
    </span>
    <span className="stamp-caption">{country.name}</span>
  </div>)}</div>
}

export function TravelMap() {
  const [active, setActive] = useState<string | null>(null)
  const country = world.find(item => item.id === active)

  return <div className="travel-map">
    <div className="map-sheet">
      <svg viewBox="0 0 720 290" role="group" aria-label={`World map. Based in Portugal; visited ${countries.map(country => country.name).join(', ')}.`} onPointerLeave={() => setActive(null)}>
        {world.map(item => <path
          key={item.id}
          d={item.path}
          data-country={item.id}
          className={`map-country${visited.has(item.id) ? ' is-visited' : ''}${item.id === based ? ' is-based' : ''}${active === item.id ? ' is-active' : ''}`}
          tabIndex={visited.has(item.id) || item.id === based ? 0 : undefined}
          role={visited.has(item.id) || item.id === based ? 'button' : undefined}
          aria-label={`${item.name}${item.id === based ? ', currently based' : visited.has(item.id) ? ', visited' : ''}`}
          aria-pressed={visited.has(item.id) || item.id === based ? active === item.id : undefined}
          onPointerEnter={() => setActive(item.id)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(item.id)}
          onBlur={() => setActive(null)}
          onClick={() => setActive(item.id)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(item.id) }
          }}
        />)}
      </svg>
      <span className={`map-label${country ? ' is-visible' : ''}`} role="status">{country?.name ?? '\u00a0'}{country?.id === based ? ' · currently based' : country && visited.has(country.id) ? ' · visited' : ''}</span>
    </div>
    <p className="map-hint"><span className="map-key map-key--visited" aria-hidden="true" />Visited places <span className="map-key map-key--based" aria-hidden="true" />Based in Portugal <span className="map-instruction">Hover or tap a country</span></p>
  </div>
}
