import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function Television3D({ on, faceRight }: { on: boolean; faceRight: boolean }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const updateRef = useRef<(on: boolean, right: boolean) => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch { return /* Keep the CSS television if WebGL is unavailable. */ }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.className = 'tv-canvas'
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-3, 3, 2.2, -2.2, 0.1, 30)
    camera.position.set(-3.2, 4.1, 8)
    camera.lookAt(0, 1.4, 0)
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(room, 0.04)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.7
    room.dispose()
    pmrem.dispose()
    scene.add(new THREE.HemisphereLight(0xfff8ec, 0x443025, 1.5))
    const light = new THREE.DirectionalLight(0xfff0dc, 2.6)
    light.position.set(-4, 7, 5)
    scene.add(light)

    const grain = document.createElement('canvas')
    grain.width = 512
    grain.height = 128
    const context = grain.getContext('2d')!
    context.fillStyle = '#743d2c'
    context.fillRect(0, 0, 512, 128)
    for (let i = 0; i < 1600; i++) {
      context.fillStyle = i % 2 ? '#d9986520' : '#28130b28'
      context.fillRect(Math.random() * 512, Math.random() * 128, 20 + Math.random() * 180, 0.3 + Math.random())
    }
    const woodTexture = new THREE.CanvasTexture(grain)
    woodTexture.colorSpace = THREE.SRGBColorSpace
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.53 })
    const silver = new THREE.MeshStandardMaterial({ color: 0xc6c7bf, metalness: 0.85, roughness: 0.3 })
    const black = new THREE.MeshStandardMaterial({ color: 0x171918, roughness: 0.38 })
    const rim = new THREE.MeshStandardMaterial({ color: 0x303330, roughness: 0.32 })
    const cream = new THREE.MeshStandardMaterial({ color: 0xe2dfc5, roughness: 0.6 })
    const indicator = new THREE.MeshBasicMaterial({ color: 0x49291d })
    const screen = new THREE.ShaderMaterial({
      uniforms: { power: { value: 0 }, time: { value: 0 } },
      vertexShader: `
        varying vec2 screenUv;
        void main() {
          screenUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 screenUv;
        uniform float power;
        uniform float time;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          vec2 corner = max(abs(screenUv - 0.5) - vec2(0.38, 0.36), 0.0) / vec2(0.12, 0.14);
          if (dot(corner, corner) > 1.0) discard;
          vec2 p = screenUv * 2.0 - 1.0;
          float vignette = 1.0 - 0.24 * dot(p, p);
          float reflection = pow(max(0.0, 1.0 - distance(screenUv, vec2(0.27, 0.86))), 5.0);
          vec3 glass = vec3(0.055, 0.075, 0.073) + reflection * 0.13;
          float noise = hash(floor(screenUv * vec2(330.0, 245.0)) + floor(time * 24.0) * vec2(37.0, 71.0));
          float scanline = 0.94 + 0.06 * sin(screenUv.y * 770.0);
          float roll = 1.0 - 0.17 * exp(-pow((fract(screenUv.y - time * 0.13) - 0.5) * 22.0, 2.0));
          vec3 snow = vec3(0.015 + noise * noise * 0.9) * scanline * roll;
          gl_FragColor = vec4(mix(glass, snow, power) * vignette + reflection * 0.025, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
    const materials = [wood, silver, black, rim, cream, indicator, screen]
    const geometries: THREE.BufferGeometry[] = []
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      geometries.push(geometry)
      const object = new THREE.Mesh(geometry, material)
      object.position.set(x, y, z)
      scene.add(object)
      return object
    }
    const box = (w: number, h: number, d: number, r: number, material: THREE.Material, x: number, y: number, z: number) =>
      mesh(new RoundedBoxGeometry(w, h, d, 4, r), material, x, y, z)

    box(4.2, 2.8, 1.65, 0.14, wood, 0, 1.5, 0)
    box(4.22, 2.8, 0.16, 0.16, silver, 0, 1.5, 0.8)
    box(3.18, 2.57, 0.17, 0.23, black, -0.42, 1.5, 0.91)
    box(3.02, 2.41, 0.13, 0.28, rim, -0.42, 1.5, 1.0)
    box(2.88, 2.27, 0.13, 0.3, black, -0.42, 1.5, 1.07)
    box(0.79, 2.55, 0.16, 0.11, black, 1.62, 1.5, 0.92)
    box(0.11, 2.3, 0.03, 0.03, cream, 1.33, 1.5, 1.015)
    for (const y of [2.12, 1.48]) {
      const dial = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 40), silver, 1.7, y, 1.08)
      dial.rotation.x = Math.PI / 2
      const inset = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 32), black, 1.7, y, 1.16)
      inset.rotation.x = Math.PI / 2
      const handle = box(0.47, 0.07, 0.08, 0.025, silver, 1.7, y, 1.2)
      handle.rotation.z = -0.48
    }
    for (let i = 0; i < 8; i++) box(0.48, 0.035, 0.04, 0.015, rim, 1.71, 0.47 + i * 0.075, 1.02)
    mesh(new THREE.SphereGeometry(0.033, 12, 8), indicator, 1.33, 0.5, 1.045)
    for (const x of [-1.45, 1.45]) box(0.45, 0.14, 0.9, 0.04, black, x, 0.1, 0)

    const glass = new THREE.PlaneGeometry(2.66, 2.05, 40, 32)
    const vertices = glass.attributes.position
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i) / 1.33
      const y = vertices.getY(i) / 1.025
      vertices.setXYZ(i, x * 1.33 * Math.sqrt(1 - y * y * 0.16), y * 1.025 * Math.sqrt(1 - x * x * 0.16), 0.13 * (1 - x * x) * (1 - y * y))
    }
    glass.computeVertexNormals()
    mesh(glass, screen, -0.42, 1.5, 1.15)

    const draw = () => renderer.render(scene, camera)
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host
      if (!width || !height) return
      camera.left = -camera.top * width / height
      camera.right = -camera.left
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      draw()
    }
    let powered = false
    let frame = 0
    let previous = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animate = (now: number) => {
      if (now - previous >= 1000 / 24) {
        screen.uniforms.time.value = now / 1000
        draw()
        previous = now
      }
      frame = requestAnimationFrame(animate)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      screen.uniforms.power.value = powered ? 1 : 0
      indicator.color.setHex(powered ? 0xf0ac61 : 0x49291d)
      draw()
      if (powered && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate)
    }
    updateRef.current = (on, right) => {
      powered = on
      camera.position.x = right ? -3.2 : 3.2
      camera.lookAt(0, 1.4, 0)
      sync()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    document.addEventListener('visibilitychange', sync)
    reducedMotion.addEventListener('change', sync)
    resize()
    setReady(true)
    return () => {
      updateRef.current = () => {}
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reducedMotion.removeEventListener('change', sync)
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      woodTexture.dispose()
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => { updateRef.current(on, faceRight) }, [on, faceRight])

  return <span ref={hostRef} className={`tv-face${ready ? ' tv-face--ready' : ''}`} data-power={on ? 'on' : 'off'} data-facing={faceRight ? 'right' : 'left'} aria-hidden="true">
    <span className="tv-fallback"><span className="tv-fallback-screen" /><span className="tv-fallback-controls">◉<br />◉<br />≡</span></span>
  </span>
}
