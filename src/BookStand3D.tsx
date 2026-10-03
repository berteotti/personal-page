import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function BookStand3D({ faceRight }: { faceRight: boolean }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const turnRef = useRef<(right: boolean) => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch { return /* Keep the CSS books when WebGL is unavailable. */ }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.1, 30)
    camera.position.set(3.2, 3.8, 8)
    camera.lookAt(0, 1.45, 0)
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(room, 0.04)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.65
    room.dispose()
    pmrem.dispose()
    scene.add(new THREE.HemisphereLight(0xfff8e7, 0x554039, 1.1))
    const light = new THREE.DirectionalLight(0xffefdf, 2)
    light.position.set(-4, 7, 5)
    scene.add(light)

    const grain = document.createElement('canvas')
    grain.width = 512
    grain.height = 128
    const context = grain.getContext('2d')!
    context.fillStyle = '#654032'
    context.fillRect(0, 0, 512, 128)
    for (let y = 0; y < 128; y += 2) {
      context.strokeStyle = y % 4 ? '#bf927050' : '#27161150'
      context.beginPath()
      for (let x = 0; x <= 512; x += 8) context.lineTo(x, y + Math.sin(x / 70 + y) * 1.5)
      context.stroke()
    }
    const texture = new THREE.CanvasTexture(grain)
    texture.colorSpace = THREE.SRGBColorSpace
    const wood = new THREE.MeshStandardMaterial({ map: texture, color: 0x937568, roughness: 0.85 })
    const pages = document.createElement('canvas')
    pages.width = 256
    pages.height = 64
    const pageContext = pages.getContext('2d')!
    pageContext.fillStyle = '#c9a777'
    pageContext.fillRect(0, 0, 256, 64)
    for (let x = 0; x < 256; x += 3) {
      pageContext.fillStyle = x % 2 ? '#f0d5a855' : '#79512d40'
      pageContext.fillRect(x, 0, 1, 64)
    }
    const pageTexture = new THREE.CanvasTexture(pages)
    pageTexture.colorSpace = THREE.SRGBColorSpace
    const paper = new THREE.MeshStandardMaterial({ map: pageTexture, color: 0xcbb58f, roughness: 1 })
    const materials = [wood, paper]
    const geometries: THREE.BufferGeometry[] = []
    const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
      const geometry = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.018, w / 3, h / 3, d / 3))
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }
    // A solid walnut shelf, low block feet, and one tall end board.
    box(3.35, 0.18, 1.55, wood, 0, 0.3, 0)
    for (const x of [-1.4, 1.4]) box(0.2, 0.22, 1.35, wood, x, 0.11, 0)
    box(0.18, 1.65, 1.38, wood, -1.46, 1.215, 0)
    const books = [
      { width: 0.36, height: 2.42, depth: 1.28, color: 0x345c72, lean: 0.025 },
      { width: 0.19, height: 2.36, depth: 1.23, color: 0x66766c, lean: 0.02 },
      { width: 0.23, height: 2.38, depth: 1.26, color: 0x815047, lean: 0.01 },
      { width: 0.28, height: 2.18, depth: 1.2, color: 0x762c38, lean: 0 },
      { width: 0.43, height: 2.67, depth: 1.32, color: 0x2f4947, lean: 0 },
      { width: 0.32, height: 2.37, depth: 1.24, color: 0x626c4c, lean: -0.035 },
      { width: 0.27, height: 1.8, depth: 1.17, color: 0x722e32, lean: 0.2 },
    ]
    let left = -1.31
    for (const book of books) {
      const cover = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.95 })
      materials.push(cover)
      const binding = new THREE.Group()
      binding.position.set(left + book.width / 2, 0.39 + Math.sin(Math.abs(book.lean)) * book.width / 2, 0)
      binding.rotation.z = book.lean
      scene.add(binding)
      const middle = book.height / 2
      box(book.width - 0.045, book.height - 0.065, book.depth - 0.07, paper, 0, middle, 0, binding)
      for (const side of [-1, 1]) {
        box(0.025, book.height, book.depth, cover, side * (book.width / 2 - 0.0125), middle, 0, binding)
      }
      // Bindings sit at the back, leaving the aged page edges visible at the front.
      box(book.width, book.height, 0.055, cover, 0, middle, -book.depth / 2 + 0.02, binding)
      left += book.width + (book.lean < 0 ? 0.34 : 0.035)
    }

    const draw = () => {
      const { clientWidth: width, clientHeight: height } = host
      if (!width || !height) return
      camera.left = -camera.top * width / height
      camera.right = -camera.left
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.render(scene, camera)
    }
    turnRef.current = right => {
      camera.position.x = right ? -3.2 : 3.2
      camera.lookAt(0, 1.45, 0)
      draw()
    }
    const observer = new ResizeObserver(draw)
    observer.observe(host)
    draw()
    setReady(true)
    return () => {
      turnRef.current = () => {}
      observer.disconnect()
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      texture.dispose()
      pageTexture.dispose()
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => { turnRef.current(faceRight) }, [faceRight])

  return <span ref={hostRef} className={`bookstand-face${ready ? ' bookstand-face--ready' : ''}`} data-facing={faceRight ? 'right' : 'left'}>
    <span className="bookstand-fallback" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
    <span className="sr-only">Wooden book stand with seven vintage books. Use arrow keys to move the book stand.</span>
  </span>
}
