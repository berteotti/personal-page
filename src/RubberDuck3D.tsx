import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// Horizontal sections: height, half-width, depth center, half-depth.
const bodyProfile = [
  [0.07, 0.01, 0.20, 0.01], [0.10, 0.54, 0.20, 0.70],
  [0.23, 0.80, 0.20, 0.98], [0.47, 0.91, 0.20, 1.08],
  [0.72, 0.88, 0.16, 1.04], [0.94, 0.72, 0.02, 0.86],
  [1.13, 0.48, -0.28, 0.55], [1.32, 0.43, -0.48, 0.43],
  [1.51, 0.55, -0.55, 0.51], [1.75, 0.65, -0.58, 0.59],
  [1.97, 0.64, -0.58, 0.58], [2.18, 0.53, -0.57, 0.48],
  [2.34, 0.32, -0.55, 0.29], [2.41, 0.01, -0.54, 0.01],
] as const

export function duckBodyGeometry() {
  const positions: number[] = []
  const indices: number[] = []
  const sides = 64
  const steps = 8
  const rings = (bodyProfile.length - 1) * steps + 1
  const interpolate = (section: number, field: 0 | 1 | 2 | 3, t: number) => {
    const a = bodyProfile[Math.max(0, section - 1)][field]
    const b = bodyProfile[section][field]
    const c = bodyProfile[section + 1][field]
    const d = bodyProfile[Math.min(bodyProfile.length - 1, section + 2)][field]
    return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)
  }

  for (let ring = 0; ring < rings; ring++) {
    const section = Math.min(Math.floor(ring / steps), bodyProfile.length - 2)
    const t = ring === rings - 1 ? 1 : (ring % steps) / steps
    const height = interpolate(section, 0, t)
    const width = Math.max(0.01, interpolate(section, 1, t))
    const center = interpolate(section, 2, t)
    const depth = Math.max(0.01, interpolate(section, 3, t))
    for (let side = 0; side < sides; side++) {
      const angle = side * Math.PI * 2 / sides
      const rear = Math.max(0, Math.sin(angle))
      const tail = 0.48 * Math.exp(-(((height - 1.02) / 0.22) ** 2)) * rear ** 8
      positions.push(width * Math.cos(angle), height, center + depth * Math.sin(angle) + tail)
    }
  }

  for (let ring = 0; ring < rings - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides
      const a = ring * sides + side
      const b = (ring + 1) * sides + side
      const c = (ring + 1) * sides + next
      const d = ring * sides + next
      indices.push(a, b, d, d, b, c)
    }
  }

  const front = positions.length / 3
  positions.push(0, bodyProfile[0][0], bodyProfile[0][2])
  const back = positions.length / 3
  positions.push(0, bodyProfile.at(-1)![0], bodyProfile.at(-1)![2])
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides
    indices.push(front, side, next)
    indices.push(back, (rings - 1) * sides + next, (rings - 1) * sides + side)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function RubberDuck3D({ squeak }: { squeak: number }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      setReady(false)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.domElement.className = 'duck-canvas'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1.65, 1.65, 1.65, -1.65, 0.1, 20)
    camera.position.set(4.5, 6.1, -6)
    camera.lookAt(0, 1.1, 0)

    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(room, 0.04)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.6
    room.dispose()
    pmrem.dispose()

    scene.add(new THREE.HemisphereLight(0xfff8e7, 0x554039, 0.9))
    const sunlight = new THREE.DirectionalLight(0xffefdf, 1.8)
    sunlight.position.set(4, 7, -5)
    sunlight.castShadow = true
    sunlight.shadow.mapSize.set(512, 512)
    Object.assign(sunlight.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 15 })
    sunlight.shadow.normalBias = 0.025
    sunlight.shadow.bias = -0.0002
    sunlight.shadow.radius = 5
    scene.add(sunlight)

    const sphere = new THREE.SphereGeometry(1, 32, 24)
    const bodyShape = duckBodyGeometry()
    const billShape = sphere.clone()
    const billVertices = billShape.getAttribute('position')
    for (let i = 0; i < billVertices.count; i++) {
      const depth = billVertices.getZ(i)
      billVertices.setX(i, billVertices.getX(i) * (1 - depth * 0.22))
      billVertices.setY(i, billVertices.getY(i) + Math.max(0, -depth) ** 2 * 0.22)
    }
    billShape.computeVertexNormals()
    const yellow = new THREE.MeshPhysicalMaterial({ color: 0xffbd00, roughness: 0.42, clearcoat: 0.12, clearcoatRoughness: 0.36 })
    const orange = new THREE.MeshPhysicalMaterial({ color: 0xf47716, roughness: 0.38, clearcoat: 0.16 })
    const lowerOrange = new THREE.MeshStandardMaterial({ color: 0xd65c0c, roughness: 0.42 })
    const mouth = new THREE.MeshStandardMaterial({ color: 0x813708, roughness: 0.6 })
    const black = new THREE.MeshPhysicalMaterial({ color: 0x16130f, roughness: 0.16, clearcoat: 0.65 })
    const shadow = new THREE.ShadowMaterial({ color: 0x160e05, opacity: 0.30 })
    const materials = [yellow, orange, lowerOrange, mouth, black, shadow]

    const part = (material: THREE.Material, position: [number, number, number], scale: [number, number, number], shape: THREE.BufferGeometry = sphere) => {
      const mesh = new THREE.Mesh(shape, material)
      mesh.position.set(...position)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      return mesh
    }

    part(yellow, [0, 0, 0], [1, 1, 1], bodyShape)
    for (const side of [-1, 1]) {
      const wing = part(yellow, [side * 0.79, 0.65, 0.32], [0.15, 0.28, 0.58], billShape)
      wing.rotation.x = -0.24
      wing.rotation.z = side * -0.15
      const eye = part(black, [side * 0.49, 1.95, -0.965], [0.095, 0.11, 0.035])
      eye.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(side * 0.74, 0.22, -0.70).normalize())
      part(mouth, [side * 0.15, 1.756, -1.31], [0.025, 0.009, 0.036])
    }
    part(lowerOrange, [0, 1.555, -1.18], [0.37, 0.07, 0.35], billShape)
    part(mouth, [0, 1.60, -1.21], [0.385, 0.014, 0.36], billShape)
    part(orange, [0, 1.67, -1.20], [0.42, 0.105, 0.39], billShape)

    const floorShape = new THREE.PlaneGeometry(20, 20)
    const floor = new THREE.Mesh(floorShape, shadow)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.06
    floor.receiveShadow = true
    scene.add(floor)

    const draw = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      const halfWidth = camera.top * width / height
      camera.left = -halfWidth
      camera.right = halfWidth
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.render(scene, camera)
    }
    const observer = new ResizeObserver(draw)
    observer.observe(host)
    draw()
    setReady(true)

    return () => {
      observer.disconnect()
      sphere.dispose()
      bodyShape.dispose()
      billShape.dispose()
      floorShape.dispose()
      environment.dispose()
      sunlight.shadow.dispose()
      materials.forEach(material => material.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    if (!squeak || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = hostRef.current?.animate([
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(-13deg) scale(.96)', offset: 0.3 },
      { transform: 'rotate(10deg) scale(1.03)', offset: 0.6 },
      { transform: 'rotate(-4deg)', offset: 0.82 },
      { transform: 'rotate(0deg) scale(1)' },
    ], { duration: 380, easing: 'ease-out' })
    return () => animation?.cancel()
  }, [squeak])

  return <span ref={hostRef} className={`duck-face${ready ? ' duck-face--ready' : ''}`} aria-hidden="true">
    <svg className="duck-fallback" viewBox="0 0 220 190">
      <defs>
        <radialGradient id="duck-body-light" cx="37%" cy="24%" r="77%">
          <stop stopColor="#fff79b" /><stop offset=".42" stopColor="#ffdc3d" /><stop offset=".78" stopColor="#eeb920" /><stop offset="1" stopColor="#b97712" />
        </radialGradient>
        <radialGradient id="duck-head-light" cx="35%" cy="24%" r="73%">
          <stop stopColor="#fff9ae" /><stop offset=".46" stopColor="#ffe450" /><stop offset=".82" stopColor="#f2c62b" /><stop offset="1" stopColor="#cb8b16" />
        </radialGradient>
        <linearGradient id="duck-beak-light" x1="0" y1="0" x2=".15" y2="1">
          <stop stopColor="#ffc06a" /><stop offset=".5" stopColor="#f58b34" /><stop offset="1" stopColor="#c9571c" />
        </linearGradient>
        <radialGradient id="duck-wing-light" cx="39%" cy="20%" r="82%">
          <stop stopColor="#fff58c" /><stop offset=".55" stopColor="#f8d13b" /><stop offset="1" stopColor="#cb9218" />
        </radialGradient>
      </defs>
      <path className="duck-body" d="M110 48C64 48 29 75 27 116c-3 43 28 72 83 74 55-2 86-31 83-74-2-41-37-68-83-68Z" />
      <path className="duck-wing" d="M42 100c-12 11-13 30-3 46 6-16 11-27 22-38-4-9-11-13-19-8Zm136 0c12 11 13 30 3 46-6-16-11-27-22-38 4-9 11-13 19-8Z" />
      <ellipse className="duck-head" cx="110" cy="70" rx="61" ry="59" />
      <path className="duck-beak-bottom" d="M88 30c3 12 12 20 22 20s19-8 22-20c-13-6-31-6-44 0Z" />
      <path className="duck-beak" d="M89 29C96 16 105 8 110 8s14 8 21 21c-13 8-29 8-42 0Z" />
      <ellipse className="duck-eye" cx="82" cy="61" rx="5" ry="8" />
      <ellipse className="duck-eye" cx="138" cy="61" rx="5" ry="8" />
      <circle className="duck-eye-glint" cx="80.5" cy="58" r="1.6" />
      <circle className="duck-eye-glint" cx="136.5" cy="58" r="1.6" />
    </svg>
  </span>
}
