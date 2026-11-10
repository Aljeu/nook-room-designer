import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { material, merge, mesh } from './shared'

type LeafLayer = THREE.BufferGeometry[]

function leaf(start: THREE.Vector3, direction: THREE.Vector3, length: number, width: number): THREE.BufferGeometry {
  const axis = direction.clone().normalize()
  let side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), axis)
  if (side.lengthSq() < 0.001) side.set(1, 0, 0)
  side.normalize()
  const normal = new THREE.Vector3().crossVectors(axis, side).normalize()
  const rows = 8, columns = 4, positions: number[] = [], breezeWeights: number[] = [], indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, fullness = Math.pow(Math.sin(Math.PI * t), 0.78)
    const center = start.clone().addScaledVector(axis, length * t).addScaledVector(normal, Math.sin(Math.PI * t) * 0.012)
    for (let column = 0; column <= columns; column++) {
      const across = column / columns * 2 - 1
      const point = center.clone().addScaledVector(side, across * width * fullness * 0.5).addScaledVector(normal, (1 - across * across) * fullness * 0.012)
      positions.push(point.x, point.y, point.z)
      breezeWeights.push(Math.pow(t, 1.35))
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('breezeWeight', new THREE.Float32BufferAttribute(breezeWeights, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function rod(start: THREE.Vector3, end: THREE.Vector3, radius: number, topRadius = radius * 0.68): THREE.BufferGeometry {
  const vector = end.clone().sub(start), length = vector.length()
  const geometry = new THREE.CylinderGeometry(topRadius, radius, length, 7, 1)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize()))
  geometry.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2)
  return geometry
}

function planter(radiusTop: number, radiusBottom: number, height: number, bottom: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, 1)
  geometry.translate(0, bottom + height / 2, 0)
  return geometry
}

function disc(radius: number, y: number, height = 0.012): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1)
  geometry.translate(0, y, 0)
  return geometry
}

function addPart(group: THREE.Group, parts: THREE.BufferGeometry[], code: string) {
  group.add(mesh(merge(parts, false, code.startsWith('PLANT_LEAF')), material(code)))
}

function fiddleLeafFig(): THREE.Group {
  const group = new THREE.Group(), leaves: LeafLayer = [], accents: LeafLayer = [], stems: THREE.BufferGeometry[] = []
  stems.push(rod(new THREE.Vector3(0, 0.36, 0), new THREE.Vector3(0.018, 1.65, 0), 0.025, 0.009))
  const count = 22
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963, t = i / (count - 1), y = 0.68 + t * 0.88
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const start = new THREE.Vector3(0.012, y, 0).addScaledVector(radial, 0.035 + (i % 3) * 0.012)
    const leafLength = 0.27 + (i % 4) * 0.026
    const direction = radial.clone().multiplyScalar(0.82).add(new THREE.Vector3(0, 0.52 + (i % 3) * 0.08, 0))
    const end = start.clone().addScaledVector(direction.clone().normalize(), leafLength)
    stems.push(rod(start, start.clone().addScaledVector(radial, 0.09).add(new THREE.Vector3(0, 0.035, 0)), 0.007, 0.004))
    const geometry = leaf(start, direction, leafLength, 0.15 + (i % 3) * 0.018)
    ;(i % 5 === 1 ? accents : leaves).push(geometry)
    if (i % 5 === 0 && y < 1.35) leaves.push(leaf(end.clone().addScaledVector(radial, -0.055), radial.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, 0.72, 0)), 0.16, 0.12))
  }
  addPart(group, leaves, 'PLANT_LEAF')
  addPart(group, accents, 'PLANT_LEAF_LIGHT')
  addPart(group, stems, 'PLANT_TRUNK')
  addPart(group, [planter(0.205, 0.17, 0.36, 0), disc(0.20, 0.36)], 'CRM')
  group.add(mesh(disc(0.165, 0.365, 0.008), material('PLANT_SOIL')))
  return group
}

function palmFrond(base: THREE.Vector3, radial: THREE.Vector3, leaves: LeafLayer, accents: LeafLayer, rachis: THREE.BufferGeometry[]) {
  const lateral = new THREE.Vector3(-radial.z, 0, radial.x).normalize()
  const reach = 0.43 + (Math.abs(radial.x) * 0.03)
  const lift = radial.y > 0.5 ? 0.95 : 0.55
  const p0 = base.clone()
  const p1 = base.clone().addScaledVector(radial, reach * 0.34).add(new THREE.Vector3(0, lift * 0.75, 0))
  const p2 = base.clone().addScaledVector(radial, reach * 0.72).add(new THREE.Vector3(0, lift * 0.82, 0))
  const p3 = base.clone().addScaledVector(radial, reach).add(new THREE.Vector3(0, lift * 0.4, 0))
  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3])
  rachis.push(new THREE.TubeGeometry(curve, 8, 0.006, 5, false))
  for (let i = 1; i <= 12; i++) {
    const t = i / 13, center = curve.getPoint(t), size = Math.sin(Math.PI * t) * (0.18 + 0.035 * Math.abs(radial.y))
    for (const sign of [-1, 1]) {
      const direction = lateral.clone().multiplyScalar(sign * 0.82).addScaledVector(radial, 0.28).add(new THREE.Vector3(0, 0.16 - t * 0.23, 0))
      const blade = leaf(center, direction, size, 0.04 + 0.008 * Math.sin(Math.PI * t))
      ;((i + sign > 0 && i % 4 === 0) ? accents : leaves).push(blade)
    }
  }
}

function arecaPalm(): THREE.Group {
  const group = new THREE.Group(), leaves: LeafLayer = [], accents: LeafLayer = [], stems: THREE.BufferGeometry[] = []
  const potBottom = planter(0.23, 0.18, 0.29, 0.13), pedestal = planter(0.155, 0.17, 0.14, 0.02)
  stems.push(rod(new THREE.Vector3(0, 0.40, 0), new THREE.Vector3(-0.012, 0.99, 0.006), 0.028, 0.018))
  for (let i = 0; i < 9; i++) {
    const angle = i * (Math.PI * 2 / 9) + 0.12
    const radial = new THREE.Vector3(Math.cos(angle), i < 3 ? 0.63 : 0.3, Math.sin(angle)).normalize()
    palmFrond(new THREE.Vector3(-0.01, 0.92 + (i % 3) * 0.07, 0), radial, leaves, accents, stems)
  }
  addPart(group, leaves, 'PLANT_LEAF')
  addPart(group, accents, 'PLANT_LEAF_LIGHT')
  addPart(group, stems, 'PLANT_TRUNK')
  addPart(group, [potBottom, pedestal], 'OFF')
  group.add(mesh(disc(0.18, 0.425, 0.008), material('PLANT_SOIL')))
  return group
}

function rubberTree(): THREE.Group {
  const group = new THREE.Group(), leaves: LeafLayer = [], accents: LeafLayer = [], stems: THREE.BufferGeometry[] = [], stand: THREE.BufferGeometry[] = []
  const trunkStart = 0.62
  stems.push(rod(new THREE.Vector3(0, trunkStart, 0), new THREE.Vector3(0.01, 1.5, 0), 0.018, 0.008))
  for (let i = 0; i < 20; i++) {
    const angle = i * 2.399963, t = i / 19, y = 0.78 + t * 0.66
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const start = new THREE.Vector3(0.005, y, 0).addScaledVector(radial, 0.025)
    const direction = radial.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, 0.55 + (i % 3) * 0.1, 0))
    const length = 0.20 + (i % 3) * 0.02
    stems.push(rod(start, start.clone().addScaledVector(radial, 0.095).add(new THREE.Vector3(0, 0.04, 0)), 0.006, 0.003))
    const blade = leaf(start, direction, length, 0.095 + (i % 2) * 0.018)
    ;(i % 4 === 2 ? accents : leaves).push(blade)
  }
  addPart(group, leaves, 'PLANT_LEAF')
  addPart(group, accents, 'PLANT_LEAF_LIGHT')
  addPart(group, stems, 'PLANT_TRUNK')
  const pot = planter(0.16, 0.14, 0.28, 0.34)
  addPart(group, [pot], 'CHA')
  group.add(mesh(disc(0.13, 0.624, 0.008), material('PLANT_SOIL')))
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    stand.push(rod(new THREE.Vector3(x * 0.19, 0.018, z * 0.19), new THREE.Vector3(x * 0.12, 0.38, z * 0.12), 0.009, 0.006))
  }
  stand.push(rod(new THREE.Vector3(-0.17, 0.10, 0), new THREE.Vector3(0.17, 0.10, 0), 0.006), rod(new THREE.Vector3(0, 0.10, -0.17), new THREE.Vector3(0, 0.10, 0.17), 0.006))
  addPart(group, stand, 'PLANT_METAL')
  return group
}

export function buildFamily(item: FurnitureInstance): THREE.Group {
  if (item.conceptId === 'PLT-PLT-01') return fiddleLeafFig()
  if (item.conceptId === 'PLT-PLT-02') return arecaPalm()
  if (item.conceptId === 'PLT-PLT-03') return rubberTree()
  throw new Error(`Unknown plant model ${item.conceptId}`)
}
