import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { box, cylinder, material, merge, mesh } from './shared'

function fanBlades(centerY: number, z: number, count = 3) {
  const shape = new THREE.Shape()
  shape.moveTo(.025, .012)
  shape.quadraticCurveTo(.035, .075, .09, .16)
  shape.quadraticCurveTo(.13, .205, .17, .17)
  shape.quadraticCurveTo(.16, .105, .09, .045)
  shape.quadraticCurveTo(.05, .02, .025, .012)
  shape.closePath()
  const parts = Array.from({ length: count }, (_, index) => {
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.rotateZ(index * Math.PI * 2 / count)
    geometry.translate(0, centerY, z)
    return geometry
  })
  return merge(parts)
}

function fanCage(radius: number, centerY: number, z: number) {
  const parts: THREE.BufferGeometry[] = []
  for (const ringRadius of [radius, radius * .82, radius * .62, radius * .4, radius * .2]) {
    const ring = new THREE.TorusGeometry(ringRadius, .004, 5, 36)
    ring.translate(0, centerY, z)
    parts.push(ring)
  }
  for (let index = 0; index < 24; index++) {
    const spoke = new THREE.BoxGeometry(radius * 2, .0035, .007)
    spoke.rotateZ(index * Math.PI / 24)
    spoke.translate(0, centerY, z)
    parts.push(spoke)
  }
  return merge(parts)
}

function cylinderZ(radius: number, depth: number, y: number, z: number) {
  const geometry = new THREE.CylinderGeometry(radius, radius, depth, 24)
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, y, z)
  return geometry
}

function buildStandFan(item: FurnitureInstance) {
  const centerY = 1.15, group = new THREE.Group()
  const shell = [
    cylinder(.2, .035, 32, .0175),
    cylinder(.024, .87, 20, .47),
    cylinder(.016, .2, 20, 1.0),
    cylinder(.047, .045, 24, .94),
    box(.035, .17, .05, 0, 1.07, 0),
    cylinderZ(.045, .13, centerY, 0),
    cylinderZ(.065, .035, centerY, .125),
  ]
  const indicators = [box(.018, .025, .008, 0, .84, .027), box(.018, .025, .008, 0, .80, .027), box(.018, .025, .008, 0, .76, .027)]
  const finishes = item.finishes
  for (const [geometry, name, finish] of [
    [merge(shell), 'Shell', finishes.Shell],
    [fanCage(.225, centerY, .13), 'Grille', finishes.Grille],
    [fanBlades(centerY, .065), 'Blade', finishes.Blade],
    [merge(indicators), 'Indicator', finishes.Indicator],
  ] as const) {
    const part = mesh(geometry, material(finish)); part.name = name; part.castShadow = true; part.receiveShadow = true; group.add(part)
  }
  return group
}

export function buildFamily(item: FurnitureInstance): THREE.Group {
  if (item.conceptId === 'VNT-APP-02') return buildStandFan(item)
  if (item.conceptId !== 'VNT-APP-01') throw new Error(`Unknown appliance model ${item.conceptId}`)
  const group = new THREE.Group(), finishes = item.finishes
  const shell = [
    box(.43, 1.62, .36, 0, .84, 0, .045),
    box(.45, .08, .38, 0, .05, 0, .025),
    box(.12, .035, .08, -.12, .018, -.12, .012),
    box(.12, .035, .08, .12, .018, -.12, .012),
    box(.38, .008, .3, 0, 1.63, 0, .01),
  ]
  const louvers: THREE.BufferGeometry[] = []
  const details = [box(.34, .24, .008, 0, 1.38, .185), box(.34, .34, .008, 0, .43, .185)]
  for (let index = 0; index < 7; index++) louvers.push(box(.32, .014, .018, 0, 1.29 + index * .031, .194))
  for (let index = 0; index < 10; index++) louvers.push(box(.32, .012, .018, 0, .29 + index * .031, .194))
  const screen = [box(.075, .028, .006, .12, 1.14, .186), box(.045, .006, .004, .12, 1.14, .191)]
  for (const [geometry, name, finish] of [[merge(shell), 'Shell', finishes.Shell], [merge(louvers), 'Grille', finishes.Grille], [merge(details), 'Display', finishes.Display], [merge(screen), 'Indicator', finishes.Indicator]] as const) {
    const part = mesh(geometry, material(finish)); part.name = name; group.add(part)
  }
  return group
}
