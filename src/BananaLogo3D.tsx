import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'

// Outline traced from the supplied BananaSplit mark; shared with the fallback.
const outline = 'M60 0C75-2 79 11 68 25C50 47 49 59 72 70C119 93 176 63 203 33C221 12 234 30 238 49C251 110 197 154 139 146C115 143 96 133 81 121C108 157 153 172 197 159C216 152 227 164 218 182C200 223 151 245 106 239C36 232-3 176 3 110C5 89 12 71 17 57C22 44-7 40 1 25C9 11 36 3 60 0Z'

export function BananaLogo3D() {
  const hostRef = useRef<HTMLSpanElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch { return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1.65, 1.65, 1.65, -1.65, 0.1, 20)
    camera.position.set(0.36, 7, 2.04)
    camera.lookAt(0, 0, 0)
    scene.add(new THREE.HemisphereLight(0xfff8e7, 0x735223, 2))
    const light = new THREE.DirectionalLight(0xfff5dc, 3)
    light.position.set(-3, 7, 5)
    scene.add(light)

    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${outline}"/></svg>`)
    const geometry = new THREE.ExtrudeGeometry(SVGLoader.createShapes(svg.paths[0]), {
      depth: 28, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 4, curveSegments: 24,
    })
    geometry.translate(-120, -120, 0)
    geometry.scale(0.01, -0.01, -0.01)
    geometry.translate(0, 0, 0.32)
    const material = new THREE.MeshStandardMaterial({ color: 0xffe400, roughness: 0.3, metalness: 0.12 })
    const logo = new THREE.Mesh(geometry, material)
    logo.rotation.set(-Math.PI / 2, 0, -0.12 + THREE.MathUtils.degToRad(20))
    scene.add(logo)

    const draw = () => {
      const { clientWidth: width, clientHeight: height } = host
      if (!width || !height) return
      camera.left = -camera.top * width / height
      camera.right = -camera.left
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
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  return <span ref={hostRef} className={`banana-face${ready ? ' banana-face--ready' : ''}`} aria-hidden="true">
    <svg className="banana-fallback" viewBox="-8 -8 256 256"><path d={outline} fill="#ffe400" /></svg>
  </span>
}
