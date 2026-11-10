import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { box, material, merge, mesh, splay } from './shared'

function addPart(group: THREE.Group, parts: THREE.BufferGeometry[], region: string, finish: string) {
  if (!parts.length) return
  const part = mesh(parts.length === 1 ? parts[0] : merge(parts), material(finish))
  part.name = region
  group.add(part)
}

function knob(x: number, y: number, z: number, radius = .018) {
  const geometry = new THREE.SphereGeometry(radius, 12, 8)
  geometry.translate(x, y, z)
  return geometry
}

function splayedLegs(width: number, depth: number, footHeight: number) {
  const parts: THREE.BufferGeometry[] = []
  for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) {
    parts.push(splay(
      xSide * (width / 2 - .018), zSide * (depth / 2 - .018),
      xSide * (width / 2 - .075), zSide * (depth / 2 - .07),
      footHeight, .042, .075,
    ))
  }
  return parts
}

function twoDrawerMidCentury(item: FurnitureInstance) {
  const { Body, Fronts, Frame, Hardware } = item.finishes
  const group = new THREE.Group()
  const body = [
    box(.49, .39, .42, 0, .345, 0, .014),
    box(.55, .045, .47, 0, .565, 0, .018),
  ]
  const fronts: THREE.BufferGeometry[] = []
  for (const y of [.445, .235]) {
    fronts.push(box(.455, .188, .018, 0, y, .22, .01))
  }
  const frame = splayedLegs(.49, .42, .17)
  const hardware = [.535, .325].map((y) => box(.19, .012, .006, 0, y, .232, .003))
  addPart(group, body, 'Body', Body)
  addPart(group, fronts, 'Fronts', Fronts)
  addPart(group, frame, 'Frame', Frame)
  addPart(group, hardware, 'Hardware', Hardware)
  return group
}

function classicTwoDrawer(item: FurnitureInstance) {
  const { Body, Fronts, Frame, Hardware } = item.finishes
  const group = new THREE.Group()
  const body = [
    box(.52, .42, .42, 0, .355, 0, .01),
    box(.59, .045, .48, 0, .58, 0, .012),
  ]
  const fronts: THREE.BufferGeometry[] = []
  const hardware: THREE.BufferGeometry[] = []
  for (const y of [.445, .225]) {
    fronts.push(box(.47, .193, .018, 0, y, .22, .008))
    hardware.push(knob(0, y, .241, .019))
  }
  const frame = splayedLegs(.52, .42, .17)
  addPart(group, body, 'Body', Body)
  addPart(group, fronts, 'Fronts', Fronts)
  addPart(group, frame, 'Frame', Frame)
  addPart(group, hardware, 'Hardware', Hardware)
  return group
}

function caneShelf(item: FurnitureInstance) {
  const { Body, Fronts, Frame, Weave, Hardware } = item.finishes
  const group = new THREE.Group()
  const body = [
    box(.075, .53, .40, -.24, .265, 0, .022),
    box(.075, .53, .40, .24, .265, 0, .022),
    box(.56, .04, .45, 0, .55, 0, .018),
    box(.43, .035, .36, 0, .17, -.015, .012),
  ]
  const fronts = [box(.424, .16, .026, 0, .445, .202, .012)]
  const frame: THREE.BufferGeometry[] = [
    box(.45, .022, .018, 0, .535, .218, .006),
    box(.45, .022, .018, 0, .355, .218, .006),
    box(.022, .20, .018, -.225, .445, .218, .006),
    box(.022, .20, .018, .225, .445, .218, .006),
  ]
  const weave: THREE.BufferGeometry[] = []
  for (let index = 0; index < 9; index++) {
    const x = -.176 + index * .044
    weave.push(box(.006, .112, .006, x, .445, .219))
  }
  for (let index = 0; index < 5; index++) {
    const y = .401 + index * .022
    weave.push(box(.36, .006, .006, 0, y, .219))
  }
  const hardware = [box(.07, .012, .012, 0, .445, .234, .004)]
  addPart(group, body, 'Body', Body)
  addPart(group, fronts, 'Fronts', Fronts)
  addPart(group, frame, 'Frame', Frame)
  addPart(group, weave, 'Weave', Weave)
  addPart(group, hardware, 'Hardware', Hardware)
  return group
}

function modernThreeDrawer(item: FurnitureInstance) {
  const { Body, Fronts, Frame, Hardware } = item.finishes
  const group = new THREE.Group()
  const body = [
    box(.49, .54, .42, 0, .27, 0, .006),
    box(.53, .04, .45, 0, .54, 0, .008),
  ]
  const fronts: THREE.BufferGeometry[] = []
  const hardware: THREE.BufferGeometry[] = []
  for (const y of [.445, .275, .105]) {
    fronts.push(box(.445, .15, .014, 0, y, .218, .005))
    hardware.push(knob(0, y, .235, .014))
  }
  const frame = [
    box(.46, .012, .008, 0, .36, .228),
    box(.46, .012, .008, 0, .19, .228),
    box(.45, .025, .39, 0, .022, 0, .004),
  ]
  addPart(group, body, 'Body', Body)
  addPart(group, fronts, 'Fronts', Fronts)
  addPart(group, frame, 'Frame', Frame)
  addPart(group, hardware, 'Hardware', Hardware)
  return group
}

export function buildFamily(item: FurnitureInstance): THREE.Group {
  if (item.conceptId === 'NST-NSD-01') return twoDrawerMidCentury(item)
  if (item.conceptId === 'NST-NSD-02') return classicTwoDrawer(item)
  if (item.conceptId === 'NST-NSD-03') return caneShelf(item)
  if (item.conceptId === 'NST-NSD-04') return modernThreeDrawer(item)
  throw new Error(`Unknown nightstand model ${item.conceptId}`)
}
