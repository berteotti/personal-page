import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { countries } from './content'
import world from './world-map.json'

// Natural Earth 1:110m, public domain; equirectangular projection, Antarctica omitted.
// Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
const visited = new Set(countries.map(country => country.id))
const based = 'PRT'

type StampShape = 'rect' | 'oval' | 'octagon' | 'circle' | 'rounded' | 'hexagon'
const shapes: StampShape[] = ['rect', 'rect', 'oval', 'octagon', 'circle', 'rounded', 'hexagon']
const inks = ['#9c3b32', '#2f4f7a', '#7a5226', '#3f6b4a', '#6b3f73', '#1f5f66', '#45454d']
const labels = ['Immigration · Entry', 'Arrival', 'Admitted', 'Entrada', 'Visitor', 'Passport control']
const inkFilters = 3

// Small deterministic variation so each stamp lands a little differently but stays put between visits.
function hash(text: string) {
  let value = 7
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 9973
  return value
}

export function stampStyle(id: string, index: number) {
  const seed = hash(id)
  return {
    shape: shapes[index % shapes.length],
    ink: inks[(index * 3 + seed) % inks.length],
    label: labels[seed % labels.length],
    tilt: (seed % 33) - 16,
    shift: { x: (seed % 13) - 6, y: ((seed >> 3) % 15) - 7 },
    filter: index % inkFilters,
  }
}

function StampOutline({ shape }: { shape: StampShape }) {
  if (shape === 'oval') return <><ellipse cx="75" cy="55" rx="70" ry="49" /><ellipse cx="75" cy="55" rx="64" ry="43" /></>
  if (shape === 'circle') return <><circle cx="75" cy="55" r="54" /><circle cx="75" cy="55" r="48" /><circle className="stamp-rule" cx="75" cy="55" r="29" /></>
  if (shape === 'octagon') return <><path d="M22 5h106l17 18v64l-17 18H22L5 87V23Z" /><path d="M25 10h100l15 15v60l-15 15H25L10 85V25Z" /></>
  if (shape === 'hexagon') return <><path d="M28 5h94l23 50-23 50H28L5 55Z" /><path className="stamp-rule" d="M31 11h88l20 44-20 44H31L11 55Z" /></>
  if (shape === 'rounded') return <><rect x="5" y="8" width="140" height="94" rx="18" /><rect className="stamp-dash" x="12" y="15" width="126" height="80" rx="12" /></>
  return <><rect x="5" y="10" width="140" height="90" rx="3" /><rect x="10" y="15" width="130" height="80" rx="1" /></>
}

export function CountryStamps() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return <div className="stamps">
    <svg className="stamp-defs" aria-hidden="true" focusable="false">
      {Array.from({ length: inkFilters }, (_, i) => <filter key={i} id={`${uid}-ink-${i}`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={i * 5 + 1} result="fine" />
        <feDisplacementMap in="SourceGraphic" in2="fine" scale="2" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed={i * 5 + 8} result="blot" />
        <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2 0 0 0 1.9" result="coverage" />
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed={i * 5 + 3} result="speck" />
        <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -9 7.1" result="holes" />
        <feComposite in="coverage" in2="holes" operator="in" result="mask" />
        <feComposite in="rough" in2="mask" operator="in" />
      </filter>)}
    </svg>
    {countries.map((country, index) => {
      const style = stampStyle(country.id, index)
      const round = style.shape === 'circle' || style.shape === 'oval'
      const arc = `${uid}-${country.id}`
      const long = country.stamp.length > 9
      return <div key={country.id} className={`stamp-entry stamp-entry--${country.id}`} style={{ '--shift-x': `${style.shift.x}px`, '--shift-y': `${style.shift.y}px` } as CSSProperties}>
        <span className={`stamp stamp--${style.shape}`} style={{ '--ink': style.ink, '--tilt': `${style.tilt}deg` } as CSSProperties} role="img" aria-label={`${country.name} passport stamp`}>
          <svg viewBox="0 0 150 110" aria-hidden="true">
            <g filter={`url(#${uid}-ink-${style.filter})`}>
              <StampOutline shape={style.shape} />
              {round ? <>
                <path id={`${arc}-top`} className="stamp-guide" d={style.shape === 'circle' ? 'M34 55a41 41 0 0 1 82 0' : 'M22 55a53 36 0 0 1 106 0'} />
                <path id={`${arc}-bottom`} className="stamp-guide" d={style.shape === 'circle' ? 'M30 55a45 45 0 0 0 90 0' : 'M18 55a57 40 0 0 0 114 0'} />
                <text className="stamp-name"><textPath href={`#${arc}-top`} startOffset="50%">{country.stamp}</textPath></text>
                <text className="stamp-visited"><textPath href={`#${arc}-bottom`} startOffset="50%">{style.label}</textPath></text>
                <text className={`stamp-code${style.shape === 'circle' ? ' stamp-code--small' : ''}`} x="75" y={style.shape === 'circle' ? 63 : 65}>{country.id}</text>
              </> : <>
                <text className="stamp-name" x="75" y="33" {...long ? { textLength: 104, lengthAdjust: 'spacingAndGlyphs' } : {}}>{country.stamp}</text>
                <path className="stamp-rule" d="M27 41h96M27 75h96" />
                <text className="stamp-code" x="75" y="67">{country.id}</text>
                <text className="stamp-visited" x="75" y="89">{style.label}</text>
                <path className="stamp-plane" d="m116 57 5-3-5-11 3-1 8 10 9-2 2 2-10 5-1 8-2 1-2-7-5 1Z" />
              </>}
            </g>
          </svg>
        </span>
        <span className="stamp-caption">{country.name}</span>
      </div>
    })}
  </div>
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
