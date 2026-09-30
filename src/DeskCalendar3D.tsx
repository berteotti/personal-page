import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function calendarReading(date: Date) {
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()).padStart(2, '0'),
  }
}

export function DeskCalendar3D({ faceRight }: { faceRight: boolean }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const turnRef = useRef<(right: boolean) => void>(() => {})
  const [reading, setReading] = useState(() => calendarReading(new Date()))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer | undefined
    let refresh = (_reading: ReturnType<typeof calendarReading>) => {}
    let dispose = () => {}
    let previous = ''
    const tick = () => {
      const next = calendarReading(new Date())
      const key = next.month + next.day
      if (key === previous) return
      previous = key
      setReading(next)
      refresh(next)
    }
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch { /* Keep the readable date when WebGL is unavailable. */ }

    if (renderer) {
      const webgl = renderer
      webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      webgl.toneMapping = THREE.ACESFilmicToneMapping
      webgl.shadowMap.enabled = true
      webgl.shadowMap.type = THREE.PCFShadowMap
      webgl.domElement.className = 'calendar-canvas'
      host.appendChild(webgl.domElement)
      const scene = new THREE.Scene()
      // Match the clock's projection, elevation, and left/right views.
      const camera = new THREE.OrthographicCamera(-2.6, 2.6, 1.8, -1.8, 0.1, 30)
      camera.position.set(3.2, 6.6, 8)
      camera.lookAt(0, 0.9, 0)
      const room = new RoomEnvironment()
      const pmrem = new THREE.PMREMGenerator(webgl)
      const environment = pmrem.fromScene(room, 0.04)
      scene.environment = environment.texture
      scene.environmentIntensity = 0.6
      room.dispose()
      pmrem.dispose()
      scene.add(new THREE.HemisphereLight(0xfff8e7, 0x554039, 0.9))
      const light = new THREE.DirectionalLight(0xffefdf, 1.8)
      light.position.set(-4, 7, 5)
      light.castShadow = true
      light.shadow.mapSize.set(1024, 1024)
      light.shadow.camera.left = light.shadow.camera.bottom = -3
      light.shadow.camera.right = light.shadow.camera.top = 3
      light.shadow.normalBias = 0.025
      scene.add(light)

      const geometries: THREE.BufferGeometry[] = []
      const materials: THREE.Material[] = []
      const textures: THREE.Texture[] = []
      const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
        const object = new THREE.Mesh(geometry, material)
        object.position.set(x, y, z)
        object.castShadow = object.receiveShadow = true
        geometries.push(geometry)
        scene.add(object)
        return object
      }
      const woodCanvas = document.createElement('canvas')
      woodCanvas.width = 512
      woodCanvas.height = 128
      const grain = woodCanvas.getContext('2d')!
      grain.fillStyle = '#e8c58d'
      grain.fillRect(0, 0, 512, 128)
      for (let row = 0; row < 128; row += 2) {
        grain.strokeStyle = `rgba(153, 101, 45, ${0.04 + (Math.sin(row * 7) + 1) * 0.045})`
        grain.lineWidth = 0.5 + (row % 3) * 0.35
        grain.beginPath()
        for (let x = 0; x <= 512; x += 8) grain.lineTo(x, row + Math.sin(x / 65 + row / 13) * 2.2)
        grain.stroke()
      }
      const woodTexture = new THREE.CanvasTexture(woodCanvas)
      woodTexture.colorSpace = THREE.SRGBColorSpace
      woodTexture.anisotropy = webgl.capabilities.getMaxAnisotropy()
      textures.push(woodTexture)
      const wood = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.58 })
      const paper = new THREE.MeshStandardMaterial({ color: 0xf3ecdc, roughness: 0.88 })
      const edge = new THREE.MeshStandardMaterial({ color: 0xc8baa0, roughness: 0.9 })
      const brass = new THREE.MeshStandardMaterial({ color: 0xb7a57b, metalness: 0.88, roughness: 0.24 })
      materials.push(wood, paper, edge, brass)
      const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) =>
        mesh(new RoundedBoxGeometry(w, h, d, 3, 0.018), material, x, y, z)
      box(3.85, 0.22, 1.02, wood, 0, 0.14, 0)
      box(3.55, 0.25, 0.3, wood, 0, 2.31, -0.08)
      for (const x of [-1.65, 1.65]) {
        const post = box(2.05, 0.25, 0.3, wood, x, 1.27, -0.08)
        post.rotation.z = Math.PI / 2
      }

      const cardContexts: CanvasRenderingContext2D[] = []
      const cardTextures: THREE.CanvasTexture[] = []
      for (const x of [-1.02, 0, 1.02]) {
        for (let layer = 0; layer < 4; layer++) {
          box(0.96, 1.65, 0.018, layer % 2 ? paper : edge, x, 1.29 + layer * 0.008, 0.1 + layer * 0.022)
        }
        const shape = new THREE.Shape()
        shape.moveTo(-0.48, -0.825)
        shape.lineTo(0.48, -0.825)
        shape.lineTo(0.48, 0.825)
        shape.lineTo(-0.48, 0.825)
        shape.closePath()
        const hole = new THREE.Path()
        hole.absarc(0, 0.66, 0.047, 0, Math.PI * 2, true)
        shape.holes.push(hole)
        mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false, curveSegments: 24 }), paper, x, 1.3, 0.19)
        const ring = mesh(new THREE.TorusGeometry(0.285, 0.024, 12, 64), brass, x, 2.235, -0.04)
        ring.rotation.y = Math.PI / 2

        const canvas = document.createElement('canvas')
        canvas.width = 384
        canvas.height = 600
        cardContexts.push(canvas.getContext('2d')!)
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = webgl.capabilities.getMaxAnisotropy()
        cardTextures.push(texture)
        textures.push(texture)
        const ink = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9, depthWrite: false })
        materials.push(ink)
        mesh(new THREE.PlaneGeometry(0.9, 1.43), ink, x, 1.22, 0.211).castShadow = false
      }
      const draw = () => {
        const { clientWidth: width, clientHeight: height } = host
        if (!width || !height) return
        camera.left = -camera.top * width / height
        camera.right = -camera.left
        camera.updateProjectionMatrix()
        webgl.setSize(width, height, false)
        webgl.render(scene, camera)
      }
      turnRef.current = right => {
        camera.position.x = right ? -3.2 : 3.2
        camera.lookAt(0, 0.9, 0)
        draw()
      }
      refresh = next => {
        for (const [index, value] of [next.month, ...next.day].entries()) {
          const context = cardContexts[index]
          context.clearRect(0, 0, 384, 600)
          context.save()
          context.fillStyle = '#241e18'
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.translate(192, 320)
          if (index === 0) context.rotate(-Math.PI / 2)
          context.font = index === 0 ? '700 174px Arial, sans-serif' : '700 490px Arial, sans-serif'
          context.fillText(value, 0, index === 0 ? 10 : 24)
          context.restore()
          cardTextures[index].needsUpdate = true
        }
        draw()
      }
      const observer = new ResizeObserver(draw)
      observer.observe(host)
      setReady(true)
      dispose = () => {
        turnRef.current = () => {}
        observer.disconnect()
        geometries.forEach(geometry => geometry.dispose())
        materials.forEach(material => material.dispose())
        textures.forEach(texture => texture.dispose())
        environment.dispose()
        light.shadow.dispose()
        webgl.dispose()
        webgl.forceContextLoss()
        webgl.domElement.remove()
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      dispose()
    }
  }, [])

  useEffect(() => { turnRef.current(faceRight) }, [faceRight])

  return <span ref={hostRef} data-facing={faceRight ? 'right' : 'left'} className={`calendar-face${ready ? ' calendar-face--ready' : ''}`}>
    <span className="calendar-fallback" aria-hidden="true"><span>{reading.month}</span><span>{reading.day[0]}</span><span>{reading.day[1]}</span></span>
    <span className="sr-only">Calendar: {reading.month} {reading.day}. Use arrow keys to move the calendar.</span>
  </span>
}
