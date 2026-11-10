import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { box, material, merge, mesh, splay } from './shared'

function addPart(group: THREE.Group, parts: THREE.BufferGeometry[], region: string, finish: string) {
  const part = mesh(parts.length === 1 ? parts[0] : merge(parts), material(finish))
  part.name = region
  group.add(part)
}

function consoleTv(item: FurnitureInstance) {
  const group = new THREE.Group(), { Frame, Screen, Stand } = item.finishes
  const screenBody = [box(.92, .54, .035, 0, .375, 0, .012)]
  const display = [box(.884, .504, .006, 0, .375, .020, .006)]
  const stand: THREE.BufferGeometry[] = [box(.075, .105, .035, 0, .095, -.005, .008)]
  for (const side of [-1, 1]) {
    stand.push(splay(side * .39, .055, side * .31, -.012, .075, .022, .04))
  }
  addPart(group, screenBody, 'Frame', Frame)
  addPart(group, display, 'Screen', Screen)
  addPart(group, stand, 'Stand', Stand)
  return group
}

function laptop(item: FurnitureInstance) {
  const group = new THREE.Group(), { Body, Screen, Keyboard, Trackpad } = item.finishes
  const body = [box(.33, .018, .23, 0, .012, 0, .006)]
  const keyboard: THREE.BufferGeometry[] = []
  for (let row = 0; row < 5; row++) for (let column = 0; column < 13; column++) {
    const x = -.137 + column * .0228
    const z = -.072 + row * .018
    keyboard.push(box(.014, .002, .010, x, .022, z, .001))
  }
  const trackpad = [box(.108, .002, .067, 0, .022, .068, .004)]
  const screenFrame = box(.32, .235, .012, 0, 0, 0, .008)
  const screenFace = box(.298, .212, .004, 0, 0, .008, .005)
  for (const part of [screenFrame, screenFace]) part.rotateX(-.08)
  screenFrame.translate(0, .14, -.105)
  screenFace.translate(0, .14, -.096)
  addPart(group, body, 'Body', Body)
  addPart(group, [screenFrame], 'Body', Body)
  addPart(group, [screenFace], 'Screen', Screen)
  addPart(group, keyboard, 'Keyboard', Keyboard)
  addPart(group, trackpad, 'Trackpad', Trackpad)
  return group
}

export function buildFamily(item: FurnitureInstance): THREE.Group {
  if (item.conceptId === 'ELC-ELC-01') return consoleTv(item)
  if (item.conceptId === 'ELC-ELC-02') return laptop(item)
  throw new Error(`Unknown electronics model ${item.conceptId}`)
}
