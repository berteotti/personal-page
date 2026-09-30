import { expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { duckBodyGeometry } from './RubberDuck3D'

test('sculpted duck is a closed mesh with outward faces and finite normals', () => {
  const geometry = duckBodyGeometry()
  const vertices = geometry.getAttribute('position')
  const indices = geometry.getIndex()!
  const edges = new Map<string, number>()
  let volume = 0
  for (let i = 0; i < indices.count; i += 3) {
    const face = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
    const [a, b, c] = face.map(index => new Vector3().fromBufferAttribute(vertices, index))
    volume += a.dot(b.cross(c)) / 6
    for (let edge = 0; edge < 3; edge++) {
      const key = [face[edge], face[(edge + 1) % 3]].sort((a, b) => a - b).join(':')
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }
  expect([...vertices.array, ...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
  expect([...edges.values()].every(count => count === 2)).toBe(true)
  expect(volume).toBeGreaterThan(2)
  geometry.dispose()
})
