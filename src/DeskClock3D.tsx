import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function clockReading(date: Date) {
  return {
    hours: String(date.getHours()).padStart(2, '0'),
    minutes: String(date.getMinutes()).padStart(2, '0'),
  }
}

export function DeskClock3D({ faceRight }: { faceRight: boolean }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const turnRef = useRef<(right: boolean) => void>(() => {})
  const [reading, setReading] = useState(() => clockReading(new Date()))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer | undefined
    let refresh = (_reading: ReturnType<typeof clockReading>) => {}
    let dispose = () => {}
    let previous = ''
    const tick = () => {
      const next = clockReading(new Date())
      const key = `${next.hours}:${next.minutes}`
      if (key === previous) return
      previous = key
      setReading(next)
      refresh(next)
    }

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch { /* Keep the readable clock when WebGL is unavailable. */ }

    if (renderer) {
      const webgl = renderer
      webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      webgl.toneMapping = THREE.ACESFilmicToneMapping
      webgl.toneMappingExposure = 1
      webgl.domElement.className = 'clock-canvas'
      host.appendChild(webgl.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-2.6, 2.6, 1.8, -1.8, 0.1, 30)
      camera.position.set(3.2, 5, 8)
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
      light.position.set(-3, 7, 5)
      scene.add(light)

      const geometries: THREE.BufferGeometry[] = []
      const materials: THREE.Material[] = []
      const box = (width: number, height: number, depth: number, radius: number, material: THREE.Material, x: number, y: number, z: number) => {
        const geometry = new RoundedBoxGeometry(width, height, depth, 4, radius)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(x, y, z)
        scene.add(mesh)
        geometries.push(geometry)
        return mesh
      }
      const red = new THREE.MeshPhysicalMaterial({ color: 0x9f2723, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.25 })
      const seam = new THREE.MeshStandardMaterial({ color: 0x541b18, roughness: 0.55 })
      const chrome = new THREE.MeshStandardMaterial({ color: 0xb5ada0, metalness: 0.85, roughness: 0.26 })
      const cream = new THREE.MeshStandardMaterial({ color: 0xe5d6b8, roughness: 0.65 })
      const rubber = new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: 0.85 })
      materials.push(red, seam, chrome, cream, rubber)
      box(3.85, 2, 0.95, 0.2, red, 0, 1.08, 0)
      box(3.82, 1.97, 0.025, 0.19, seam, 0, 1.08, 0.22)
      box(3.86, 2.01, 0.3, 0.2, red, 0, 1.08, 0.38)
      box(3.52, 1.69, 0.07, 0.1, chrome, 0, 1.08, 0.548)
      box(3.43, 1.6, 0.07, 0.08, cream, 0, 1.08, 0.586)
      for (const x of [-1.35, 1.35]) box(0.48, 0.13, 0.65, 0.05, rubber, x, 0.08, 0)

      const face = document.createElement('canvas')
      face.width = 1200
      face.height = 490
      const context = face.getContext('2d')!
      const texture = new THREE.CanvasTexture(face)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = webgl.capabilities.getMaxAnisotropy()
      const faceMaterial = new THREE.MeshBasicMaterial({ map: texture })
      materials.push(faceMaterial)
      const plane = new THREE.PlaneGeometry(3.26, 1.5)
      geometries.push(plane)
      const display = new THREE.Mesh(plane, faceMaterial)
      display.position.set(0, 1.08, 0.627)
      scene.add(display)

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
        const background = context.createLinearGradient(0, 0, 1200, 490)
        background.addColorStop(0, '#e9dfc9')
        background.addColorStop(1, '#c9bca1')
        context.fillStyle = background
        context.fillRect(0, 0, 1200, 490)
        for (const [index, value] of [next.hours, next.minutes].entries()) {
          const x = 120 + index * 570
          context.fillStyle = '#282d28'
          context.fillRect(x - 7, 65, 404, 360)
          const card = context.createLinearGradient(0, 72, 0, 410)
          card.addColorStop(0, index ? '#316c59' : '#547d87')
          card.addColorStop(0.5, index ? '#437f68' : '#6d929a')
          card.addColorStop(0.51, index ? '#356f58' : '#60858e')
          card.addColorStop(1, index ? '#407860' : '#72979e')
          context.fillStyle = card
          context.fillRect(x, 72, 390, 340)
          context.fillStyle = '#ecdbac'
          context.font = '500 280px Arial, sans-serif'
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.fillText(value, x + 195, 240)
          context.fillStyle = '#162922aa'
          context.fillRect(x, 240, 390, 4)
          context.fillStyle = '#eee4c52b'
          context.fillRect(x, 245, 390, 2)
          for (const y of [387, 394, 401, 408]) {
            context.fillStyle = '#172f313d'
            context.fillRect(x, y, 390, 2)
          }
          context.fillStyle = '#232722'
          context.fillRect(x - 3, 227, 13, 33)
          context.fillRect(x + 380, 227, 13, 33)
          context.fillStyle = '#e0d4ba'
          context.fillRect(x + 187, 67, 16, 17)
        }
        const glass = context.createLinearGradient(0, 0, 1000, 490)
        glass.addColorStop(0, '#ffffff20')
        glass.addColorStop(0.45, '#ffffff00')
        glass.addColorStop(0.46, '#ffffff0b')
        glass.addColorStop(1, '#ffffff00')
        context.fillStyle = glass
        context.fillRect(0, 0, 1200, 490)
        texture.needsUpdate = true
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
        texture.dispose()
        environment.dispose()
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

  return <span data-facing={faceRight ? 'right' : 'left'} ref={hostRef} className={`clock-face${ready ? ' clock-face--ready' : ''}`}>
    <span className="clock-fallback" aria-hidden="true"><span>{reading.hours}</span><span>{reading.minutes}</span></span>
    <span className="sr-only">Local time {reading.hours}:{reading.minutes}. Use arrow keys to move the clock.</span>
  </span>
}
