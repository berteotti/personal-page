import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent, KeyboardEvent, ReactNode, RefObject } from 'react'
import { flushSync } from 'react-dom'
import { motion, useDragControls, useMotionValue, useReducedMotion } from 'motion/react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { blogPosts, countries, photos, profile } from './content'
import { CountryStamps, TravelMap } from './TravelMap'
import { defaultLayout, itemIds, normalizePosition, parseLayout, positionFor, resetLayout } from './layout'
import type { ItemId, Layout, Point, Size, Viewport } from './layout'
import { RubberDuck3D } from './RubberDuck3D'
import { DeskClock3D } from './DeskClock3D'
import { BookStand3D } from './BookStand3D'
import { BananaLogo3D } from './BananaLogo3D'

const storageKey = (viewport: Viewport) => `personal-desk-layout-v3-${viewport}`
let squeakContext: AudioContext | undefined

function squeakDuck() {
  if (!window.AudioContext) return
  const context = squeakContext ??= new AudioContext()
  if (context.state === 'suspended') void context.resume().catch(() => {})
  const start = context.currentTime
  const oscillator = context.createOscillator()
  const filter = context.createBiquadFilter()
  const volume = context.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(900, start)
  oscillator.frequency.exponentialRampToValueAtTime(430, start + 0.2)
  filter.type = 'lowpass'
  filter.frequency.value = 1800
  volume.gain.setValueAtTime(0.0001, start)
  volume.gain.exponentialRampToValueAtTime(0.16, start + 0.025)
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.23)
  oscillator.connect(filter).connect(volume).connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + 0.23)
  oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); volume.disconnect() }
}

function readLayout(viewport: Viewport): Layout | null {
  try {
    const saved = localStorage.getItem(storageKey(viewport))
    return !saved && viewport === 'mobile' ? null : parseLayout(saved, viewport)
  } catch { return viewport === 'mobile' ? null : defaultLayout(viewport) }
}

function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop')
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setViewport(query.matches ? 'mobile' : 'desktop')
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return viewport
}

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}

type DeskItemProps = {
  id: ItemId
  point: Point
  order: number
  viewport: Viewport
  deskSize: { width: number; height: number }
  onRaise: (id: ItemId) => void
  onMove: (id: ItemId, point: Point) => void
  onOpen: (id: ItemId) => void
  triggerRef: (id: ItemId, button: HTMLButtonElement | HTMLAnchorElement | null) => void
  children: ReactNode
}

function DeskItem({ id, point, order, viewport, deskSize, onRaise, onMove, onOpen, triggerRef, children }: DeskItemProps) {
  const itemRef = useRef<HTMLDivElement>(null)
  const itemSize = useSize(itemRef)
  const controls = useDragControls()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const wasDragged = useRef(false)
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; origin?: Point; active: boolean }>({ active: false })
  const [held, setHeld] = useState(false)
  const [dragSide, setDragSide] = useState<boolean | null>(null)
  const position = positionFor(point, deskSize, itemSize)
  const limit = positionFor({ x: 1, y: 1 }, deskSize, itemSize)
  const faceRight = dragSide ?? (position.x + itemSize.width / 2 < deskSize.width / 2)

  const cancelHold = () => {
    clearTimeout(hold.current.timer)
    hold.current = { active: false }
    setHeld(false)
  }

  useEffect(() => {
    const item = itemRef.current
    const preventScroll = (event: TouchEvent) => {
      if (hold.current.active && event.cancelable) event.preventDefault()
    }
    item?.addEventListener('touchmove', preventScroll, { passive: false })
    return () => {
      clearTimeout(hold.current.timer)
      hold.current = { active: false }
      item?.removeEventListener('touchmove', preventScroll)
    }
  }, [viewport])

  const startHold = (event: PointerEvent<HTMLDivElement>) => {
    wasDragged.current = false
    if (viewport !== 'mobile' || !event.isPrimary || event.button !== 0) return
    cancelHold()
    hold.current.origin = { x: event.clientX, y: event.clientY }
    hold.current.timer = setTimeout(() => {
      hold.current.active = true
      wasDragged.current = true
      itemRef.current?.setPointerCapture(event.pointerId)
      setHeld(true)
      controls.start(event)
    }, 80)
  }

  useLayoutEffect(() => {
    x.set(0)
    y.set(0)
  }, [viewport, deskSize.width, deskSize.height, itemSize.width, itemSize.height, x, y])

  const move = (delta: Point) => {
    const next = normalizePosition({ x: position.x + delta.x, y: position.y + delta.y }, deskSize, itemSize)
    onRaise(id)
    onMove(id, next)
  }

  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 48 : 16
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    }
    if (delta[event.key]) { event.preventDefault(); move(delta[event.key]) }
  }

  const finishDrag = (offset: Point) => {
    const next = normalizePosition({ x: position.x + offset.x, y: position.y + offset.y }, deskSize, itemSize)
    flushSync(() => onMove(id, next))
    x.set(0)
    y.set(0)
    setDragSide(null)
  }

  return (
    <motion.div
      ref={itemRef}
      className={`desk-item desk-item--${id}${held ? ' is-held' : ''}`}
      style={{ left: position.x, top: position.y, zIndex: order + 1, x, y }}
      drag
      dragControls={controls}
      dragListener={viewport === 'desktop'}
      dragConstraints={{ left: -position.x, right: limit.x - position.x, top: -position.y, bottom: limit.y - position.y }}
      dragMomentum={false}
      dragElastic={0}
      onPointerDown={startHold}
      onPointerMove={event => {
        const origin = hold.current.origin
        if (!hold.current.active && origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) cancelHold()
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={() => { if (!hold.current.active) cancelHold() }}
      onContextMenu={event => { if (viewport === 'mobile') event.preventDefault() }}
      onDragStart={() => { wasDragged.current = true; onRaise(id) }}
      onDrag={(_, info) => {
        if (id === 'clock' || id === 'bookstand') setDragSide(position.x + info.offset.x + itemSize.width / 2 < deskSize.width / 2)
      }}
      onDragEnd={(_, info) => finishDrag(info.offset)}
      whileDrag={{ scale: 1.025, cursor: 'grabbing' }}
    >
      {id === 'banana' || id === 'github' ? <a
        ref={node => triggerRef(id, node)}
        className="object-open"
        href={id === 'github' ? 'https://github.com/berteotti' : 'https://bananasplit.net'}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${id === 'github' ? 'Leo’s GitHub' : 'BananaSplit'} (opens in a new tab)`}
        draggable={false}
        onKeyDown={handleKey}
        onClick={event => {
          if (wasDragged.current) { event.preventDefault(); wasDragged.current = false }
        }}
      >{id === 'banana' ? <BananaLogo3D /> : <span className="github-disk" aria-hidden="true"><img src="/images/github.png" alt="" draggable={false} /></span>}</a> : <button
        ref={node => triggerRef(id, node)}
        type="button"
        className="object-open"
        aria-label={id === 'duck' ? 'Squeak rubber duck' : id === 'note' ? 'Open about me note' : id === 'notebook' ? 'Open My takes notebook' : id === 'projects' ? 'Open Projects folder' : undefined}
        onKeyDown={handleKey}
        onClick={() => {
          if (wasDragged.current) { wasDragged.current = false; return }
          onOpen(id)
        }}
      >{id === 'clock' ? <DeskClock3D faceRight={faceRight} /> : id === 'bookstand' ? <BookStand3D faceRight={faceRight} /> : id === 'note' ? null : children}</button>}
      {id === 'note' && <div className="object-open note-preview">{children}</div>}
    </motion.div>
  )
}

export function DeskLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const viewport = useViewport()
  const deskRef = useRef<HTMLElement>(null)
  const deskSize = useSize(deskRef)
  const [layouts, setLayouts] = useState<Record<Viewport, Layout | null>>(() => ({ desktop: readLayout('desktop'), mobile: readLayout('mobile') }))
  const [duckSqueaks, setDuckSqueaks] = useState(0)
  const layout = layouts[viewport] ?? defaultLayout(viewport)
  const lastOpened = useRef<ItemId | null>(null)
  const triggers = useRef<Partial<Record<ItemId, HTMLButtonElement | HTMLAnchorElement | null>>>({})

  useEffect(() => {
    if (location.pathname === '/' && lastOpened.current) {
      const id = lastOpened.current
      lastOpened.current = null
      requestAnimationFrame(() => triggers.current[id]?.focus())
    }
  }, [location.pathname])

  useEffect(() => {
    if (!layouts[viewport]) return
    try { localStorage.setItem(storageKey(viewport), JSON.stringify(layout)) } catch { /* Private browsing can disable storage. */ }
  }, [layout, viewport])

  const update = (change: (current: Layout) => Layout) => {
    setLayouts(old => ({ ...old, [viewport]: change(old[viewport] ?? defaultLayout(viewport)) }))
  }
  const raise = (id: ItemId) => update(current => ({ ...current, order: [...current.order.filter(item => item !== id), id] }))
  const move = (id: ItemId, point: Point) => update(current => ({ ...current, positions: { ...current.positions, [id]: point } }))
  const open = (id: ItemId) => {
    if (id === 'clock' || id === 'bookstand') { raise(id); return }
    if (id === 'duck') { squeakDuck(); setDuckSqueaks(count => count + 1); return }
    lastOpened.current = id
    navigate(id === 'note' ? '/about' : id === 'postcard' ? '/travels' : id === 'notebook' ? '/blog' : id === 'projects' ? '/projects' : `/photos/${id.slice(-2)}`, { state: { fromDesk: true } })
  }
  const reset = () => {
    const desk = deskRef.current
    if (!desk) return
    const sizes = {} as Record<ItemId, Size>
    for (const id of itemIds) {
      const item = desk.querySelector<HTMLElement>(`.desk-item--${id}`)
      if (!item) return
      sizes[id] = { width: item.offsetWidth, height: item.offsetHeight }
    }
    update(() => resetLayout(viewport, { width: desk.clientWidth, height: desk.clientHeight }, sizes))
  }
  const photo = (id: ItemId) => photos.find(p => `photo-${p.id}` === id)!

  useLayoutEffect(() => {
    if (!layouts[viewport] && deskSize.width) reset()
  }, [viewport, deskSize.width, deskSize.height, layouts])

  return <>
    <main className="desk" ref={deskRef} aria-label="Leonardo’s personal desk">
      <div className="desk-grain" aria-hidden="true" />
      <div className="desk-mat" aria-hidden="true" />
      {itemIds.map(id => <DeskItem
        key={id} id={id} point={layout.positions[id]} order={layout.order.indexOf(id)}
        viewport={viewport} deskSize={deskSize}
        onRaise={raise} onMove={move} onOpen={open}
        triggerRef={(item, button) => { triggers.current[item] = button }}
      >
        {id === 'note' && <div className="note-face">
          <h1>Hey, I’m Leo.</h1>
          <span className="note-rule" aria-hidden="true" />
          <div className="ruled-copy">
          <p className="note-bio">{profile.biography}</p>
          <p className="note-bio">Currently building <a href="https://bananasplit.net" target="_blank" rel="noopener noreferrer" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>bananasplit.net</a></p>
          </div>
          <span className="open-prompt">Open note <span aria-hidden="true">→</span></span>
        </div>}
        {id === 'duck' && <RubberDuck3D squeak={duckSqueaks} />}
        {id === 'projects' && <span className="projects-folder">
          <span className="folder-icon" aria-hidden="true"><span className="folder-back" /><span className="folder-paper" /><span className="folder-front" /></span>
          <span className="folder-label">Projects</span>
        </span>}
        {id === 'notebook' && <div className="notebook-cover">
          <span className="notebook-label">My takes</span>
        </div>}
        {id.startsWith('photo-') && <div className="polaroid-face">
          <img src={photo(id).src} alt={photo(id).alt} draggable="false" />
          <span className="polaroid-caption">{photo(id).caption}</span>
        </div>}
        {id === 'postcard' && <div className="postcard-face">
          <span className="postcard-heading" aria-hidden="true">Carte postale</span>
          <span className="postcard-airmail" aria-hidden="true">Par avion · Air mail</span>
          <span className="postcard-postage" aria-hidden="true"><span>Correio</span><svg viewBox="0 0 40 42"><path d="M5 31 16 16l7 10 5-6 8 11M25 10h.01" /><path d="M5 35h31" /></svg><span>Portugal</span></span>
          <CountryStamps />
          <div className="postcard-copy"><h2>Places I’ve been</h2><p>A world of memories.</p></div>
          <div className="postcard-address" aria-hidden="true"><span>To: the curious ones</span><span>Somewhere out there</span><span>With love, Leonardo</span></div>
          <span className="postcard-open">Explore the map ↗</span>
        </div>}
      </DeskItem>)}
      <button className="reset-button" type="button" onClick={reset}>Reset desk</button>
    </main>
    <Outlet />
  </>
}

function PaperDialog({ title, children, paperClassName = '' }: { title: string; children: ReactNode; paperClassName?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const close = () => location.state?.fromDesk ? navigate(-1) : navigate('/')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { if (dialog?.open) dialog.close(); document.body.style.overflow = oldOverflow }
  }, [])

  return <dialog
    ref={dialogRef}
    className={`detail-dialog${reducedMotion ? ' no-motion' : ''}`}
    aria-label={title}
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}
  >
    <div className={`detail-paper ${paperClassName}`}>
      <button className="detail-close" type="button" onClick={close} aria-label="Close detail">×</button>
      {children}
    </div>
  </dialog>
}

export function Detail({ kind }: { kind: 'about' | 'photo' | 'travels' }) {
  const { photoId } = useParams()
  if (kind === 'about') return <PaperDialog title="About Leo" paperClassName="about-paper"><div className="detail-content about-detail">
    <p className="detail-kicker">A note from the desk</p>
    <h2>Hey, I’m Leo.</h2>
    <div className="ruled-copy">
    <p className="detail-lead">I’m a software engineer who likes creating new products, playing games, trying different sports, and going to the gym.</p>
    <p>In this new age of AI, I’m leaning toward becoming an artist, creating new and interesting products that vibe with my current needs, inspiration, and view of the world.</p>
    <p>That’s why I’m currently building <a href="https://bananasplit.net" target="_blank" rel="noopener noreferrer">bananasplit.net</a>.</p>
    <p>I’m a curious person who likes to travel, thanks to my mixed cultural background. Beyond computer stuff, I like learning more about history and science.</p>
    </div>
  </div></PaperDialog>
  if (kind === 'travels') return <PaperDialog title="Places I’ve been" paperClassName="travels-paper"><div className="detail-content travels-detail"><p className="detail-kicker">Postcards from the world · {String(countries.length).padStart(2, '0')} countries</p><h2>Places I’ve been</h2><p className="map-intro">A few places that have become a part of my story.</p><TravelMap /><section className="passport-collection" aria-labelledby="passport-title"><h3 id="passport-title">A passport full of memories</h3><CountryStamps /></section></div></PaperDialog>
  const photo = photos.find(item => item.id === photoId)
  if (!photo) return <NotFound />
  return <PaperDialog title={photo.caption}><div className="detail-content photo-detail"><img src={photo.src} alt={photo.alt} /><h2>{photo.caption}</h2>{photo.description && <p>{photo.description}</p>}</div></PaperDialog>
}

const takesPerPage = 6

export function Blog({ posts = blogPosts }: { posts?: typeof blogPosts }) {
  const overflow = posts.slice(takesPerPage)
  return <PaperDialog title="My takes" paperClassName="notebook-paper">
    <div className="notebook-spread">
      <section className="notebook-page notebook-page--left">
        <h2 className="notebook-heading">My takes</h2>
        <div className="ruled-copy">
          {posts.length === 0 ? <p className="notebook-empty">there are no personal takes, for now</p> :
            <ol className="notebook-takes">{posts.slice(0, takesPerPage).map(post => <li key={post.id}>{post.title}</li>)}</ol>}
        </div>
        <span className="notebook-folio" aria-hidden="true">1</span>
      </section>
      <section className="notebook-page notebook-page--right" aria-hidden={overflow.length ? undefined : true}>
        <span className="notebook-heading-space" />
        <div className="ruled-copy">
          {overflow.length > 0 && <ol className="notebook-takes" start={takesPerPage + 1}>{overflow.map(post => <li key={post.id}>{post.title}</li>)}</ol>}
        </div>
        <span className="notebook-stain" aria-hidden="true" />
        <span className="notebook-folio" aria-hidden="true">2</span>
      </section>
    </div>
    <span className="notebook-ribbon" aria-hidden="true" />
    <span className="notebook-band" aria-hidden="true" />
  </PaperDialog>
}

export function Projects() {
  return <PaperDialog title="Projects" paperClassName="projects-window">
    <header className="projects-toolbar">
      <span className="window-lights" aria-hidden="true"><i /><i /></span>
      <h2>Projects</h2>
      <span className="projects-view-icon" aria-hidden="true">▦</span>
    </header>
    <div className="projects-body">
      <aside className="projects-sidebar"><p>Favorites</p><span className="projects-selected"><span aria-hidden="true">▰</span> Projects</span></aside>
      <div className="projects-files">
        <a className="project-file" href="https://bananasplit.net" target="_blank" rel="noopener noreferrer" aria-label="Visit BananaSplit (opens in a new tab)">
          <img className="project-app-icon" src="/images/bananasplit.png" alt="" width="70" height="70" />
          <span>BananaSplit</span><small>bananasplit.net ↗</small>
        </a>
        <a className="project-file" href="https://gymious.pt" target="_blank" rel="noopener noreferrer" aria-label="Visit Gymious (opens in a new tab)">
          <img className="project-app-icon" src="/images/gymious.png" alt="" width="70" height="70" />
          <span>Gymious</span><small>gymious.pt ↗</small>
        </a>
      </div>
    </div>
    <footer className="projects-status">2 items</footer>
  </PaperDialog>
}

export function NotFound() {
  const navigate = useNavigate()
  return <PaperDialog title="Page not found"><div className="detail-content"><h2>Nothing here yet.</h2><p>That object is not on this desk.</p><button className="home-button" type="button" onClick={() => navigate('/')}>Return to desk</button></div></PaperDialog>
}
