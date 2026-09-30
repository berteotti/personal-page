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
    camera.position.set(3.2, 4.8, 8)
    camera.lookAt(0, 1.25, 0)
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
    context.fillStyle = '#b88746'
    context.fillRect(0, 0, 512, 128)
    for (let y = 0; y < 128; y += 2) {
      context.strokeStyle = y % 4 ? '#d4a06b30' : '#38231728'
      context.beginPath()
      for (let x = 0; x <= 512; x += 8) context.lineTo(x, y + Math.sin(x / 70 + y) * 1.5)
      context.stroke()
    }
    const texture = new THREE.CanvasTexture(grain)
    texture.colorSpace = THREE.SRGBColorSpace
    const wood = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 })
    const brass = new THREE.MeshStandardMaterial({ color: 0xb69b63, metalness: 0.8, roughness: 0.35 })
    const paper = new THREE.MeshStandardMaterial({ color: 0xe6dcc5, roughness: 0.9 })
    const pageEdge = new THREE.MeshStandardMaterial({ color: 0xc7b99c, roughness: 1 })
    const materials = [wood, brass, paper, pageEdge]
    const geometries: THREE.BufferGeometry[] = []
    const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
      const geometry = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.035, h / 3))
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      scene.add(mesh)
      return mesh
    }
    const rack = new THREE.Group()
    rack.position.set(0, 0.6, 0.22)
    rack.rotation.x = -0.3
    scene.add(rack)
    const rackBox = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = box(w, h, d, material, x, y, z)
      rack.add(mesh)
      return mesh
    }
    // Open wooden side frames and splayed feet, like a miniature reading rack.
    for (const x of [-1.3, 1.3]) {
      for (const z of [-0.62, 0.62]) rackBox(0.18, 2.2, 0.18, wood, x, 1.02, z)
      for (const y of [0, 2.08]) rackBox(0.18, 0.18, 1.42, wood, x, y, 0)
      const frontLeg = box(0.19, 1.15, 0.2, wood, x, 0.5, 0.46)
      frontLeg.rotation.x = -0.55
      const backLeg = box(0.19, 1.15, 0.2, wood, x, 0.5, -0.44)
      backLeg.rotation.x = 0.55
      rackBox(0.025, 0.055, 0.055, brass, x + Math.sign(x) * 0.098, 0.12, 0.62)
    }
    for (const z of [-0.48, 0.48]) rackBox(2.5, 0.14, 0.22, wood, 0, 0.03, z)
    rackBox(2.78, 0.12, 0.12, wood, 0, 0.52, 0.72)
    rackBox(2.5, 0.13, 0.13, wood, 0, 1.1, -0.68)
    const books = [
      { width: 0.46, height: 2.05, depth: 1.17, color: 0xe3d8bd },
      { width: 0.51, height: 1.85, depth: 1.12, color: 0x405b50 },
      { width: 0.43, height: 2.15, depth: 1.2, color: 0x994f3c },
      { width: 0.49, height: 1.97, depth: 1.15, color: 0xa69a7b },
    ]
    let left = -1.02
    for (const book of books) {
      const cover = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.85 })
      materials.push(cover)
      const x = left + book.width / 2
      const middle = 0.13 + book.height / 2
      rackBox(book.width - 0.055, book.height - 0.07, book.depth - 0.07, paper, x, middle, 0)
      for (const side of [-1, 1]) {
        rackBox(0.028, book.height, book.depth, cover, x + side * (book.width / 2 - 0.014), middle, 0)
      }
      rackBox(book.width, book.height, 0.065, cover, x, middle, book.depth / 2 - 0.02)
      // Small paper spine labels and binding bands stay legible at desk scale.
      rackBox(book.width * 0.55, 0.55, 0.012, paper, x, middle + 0.32, book.depth / 2 + 0.018)
      for (const y of [0.37, book.height - 0.03]) {
        rackBox(book.width * 0.85, 0.025, 0.012, brass, x, y, book.depth / 2 + 0.018)
      }
      for (let offset = -book.width / 2 + 0.07; offset < book.width / 2 - 0.03; offset += 0.05) {
        rackBox(0.006, 0.008, book.depth - 0.1, pageEdge, x + offset, book.height + 0.099, 0)
      }
      left += book.width + 0.035
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
      camera.lookAt(0, 1.25, 0)
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
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => { turnRef.current(faceRight) }, [faceRight])

  return <span ref={hostRef} className={`bookstand-face${ready ? ' bookstand-face--ready' : ''}`} data-facing={faceRight ? 'right' : 'left'}>
    <span className="bookstand-fallback" aria-hidden="true"><i /><i /><i /><i /></span>
    <span className="sr-only">Wooden book stand with four upright books. Use arrow keys to move the book stand.</span>
  </span>
}
