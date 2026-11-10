import * as THREE from 'three'
import type { DoorStyle } from '../catalog/doors'
import { box, material, mesh } from './shared'

function addBox(group: THREE.Group, width: number, height: number, depth: number, x: number, y: number, z: number, finish: string, name: string) {
  const part = mesh(box(width, height, depth, x, y, z), material(finish))
  part.name = name
  part.castShadow = true
  part.receiveShadow = true
  group.add(part)
  return part
}

function archFill(height: number, innerRadius: number, spring: number, halfWidth: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-halfWidth, height)
  shape.lineTo(halfWidth, height)
  shape.lineTo(halfWidth, spring)
  shape.lineTo(innerRadius, spring)
  shape.absarc(0, spring, innerRadius, 0, Math.PI, false)
  shape.lineTo(-halfWidth, spring)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .1, bevelEnabled: false, curveSegments: 24 })
  geometry.translate(0, 0, -.1)
  return geometry
}

function makeArchway(group: THREE.Group, width: number, height: number, style: DoorStyle, includeWallFill: boolean) {
  const trim = style.frame === 'classic' ? .115 : style.id === 'DR-ARCH-MODERN-01' ? .055 : .075
  const radius = Math.min(width / 2 - trim / 2, height - trim / 2)
  const spring = Math.max(.02, height - radius - trim / 2)
  addBox(group, trim, spring, .14, -width / 2 + trim / 2, spring / 2, -.05, style.frameFinish, 'Left casing')
  addBox(group, trim, spring, .14, width / 2 - trim / 2, spring / 2, -.05, style.frameFinish, 'Right casing')
  const points = Array.from({ length: 33 }, (_, i) => {
    const angle = Math.PI - Math.PI * i / 32
    return new THREE.Vector3(radius * Math.cos(angle), spring + radius * Math.sin(angle), .02)
  })
  const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, trim / 2, 8, false), material(style.frameFinish))
  arch.name = 'Arch casing'; arch.castShadow = true; arch.receiveShadow = true; group.add(arch)
  const outerArch = arch.clone()
  outerArch.scale.z = -1
  outerArch.position.z = -.1
  group.add(outerArch)
  if (includeWallFill) {
    const fill = new THREE.Mesh(archFill(height, Math.max(.08, radius - trim / 2), spring, width / 2), material('OFF'))
    fill.name = 'Arch fill'; fill.castShadow = true; fill.receiveShadow = true; group.add(fill)
  }
}

function addPanel(group: THREE.Group, x: number, y: number, width: number, height: number, finish: string, frame: string) {
  const rail = Math.min(.026, Math.max(.014, width * .07))
  const z = .079
  addBox(group, width, height, .013, x, y, z, frame, 'Panel rail')
  addBox(group, Math.max(.025, width - rail * 2), Math.max(.025, height - rail * 2), .01, x, y, z + .01, finish, 'Inset panel')
}

function addLeaf(group: THREE.Group, style: DoorStyle, centerX: number, leafWidth: number, height: number, index: number, glass: boolean) {
  const parent = group
  group = new THREE.Group()
  parent.add(group)
  const faceZ = .04
  addBox(group, leafWidth, height - .035, .048, centerX, (height - .035) / 2, faceZ, style.leafFinish, `Door leaf ${index + 1}`)
  const insetX = leafWidth * .16
  const top = height - .11
  if (style.construction === 'plank') {
    const rows = Math.max(5, Math.floor(height / .36))
    for (let row = 1; row < rows; row++) addBox(group, leafWidth - insetX * 2, .006, .003, centerX, .06 + (height - .12) * row / rows, .066, style.frameFinish, 'Plank seam')
    addBox(group, .012, height - .22, .004, centerX - leafWidth / 2 + .05, height / 2, .067, style.frameFinish, 'Stile detail')
    addBox(group, .012, height - .22, .004, centerX + leafWidth / 2 - .05, height / 2, .067, style.frameFinish, 'Stile detail')
  } else if (style.construction === 'six-panel') {
    const gap = .08, panelWidth = (leafWidth - insetX * 2 - gap) / 2, panelHeight = (height - .3) / 3 * .68
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      const y = .14 + (height - .34) * (row + .5) / 3
      addPanel(group, centerX + (col ? 1 : -1) * (panelWidth + gap) / 2, y, panelWidth, panelHeight, style.leafFinish, style.frameFinish)
    }
  } else if (style.construction === 'two-panel') {
    for (let row = 0; row < 2; row++) addPanel(group, centerX, .16 + (height - .32) * (row + .5) / 2, leafWidth - insetX * 2, (height - .46) / 2, style.leafFinish, style.frameFinish)
  } else if (glass) {
    const paneHeight = height * .43, paneWidth = (leafWidth - insetX * 2 - .04) / 2
    for (let col = 0; col < 2; col++) {
      const pane = addBox(group, paneWidth, paneHeight, .008, centerX + (col ? 1 : -1) * (paneWidth + .04) / 2, height - paneHeight / 2 - .16, .074, 'GLASS', 'Glazed pane')
      pane.material = material('GLASS')
    }
    addBox(group, .03, paneHeight, .026, centerX, height - paneHeight / 2 - .16, .084, style.frameFinish, 'Glass mullion')
    addBox(group, leafWidth - insetX * 2, .025, .026, centerX, height - paneHeight - .16, .084, style.frameFinish, 'Glass rail')
    addPanel(group, centerX, .34, leafWidth - insetX * 2, height * .22, style.leafFinish, style.frameFinish)
  }
  const longPull = style.category === 'main' || style.construction === 'plank'
  const hardwareX = centerX + (index === 0 ? leafWidth / 2 - .075 : -leafWidth / 2 + .075)
  if (longPull) addBox(group, .025, Math.min(.52, height * .3), .032, hardwareX, height * .55, .112, style.hardwareFinish, 'Long pull')
  else {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.026, 12, 8), material(style.hardwareFinish))
    knob.name = 'Door knob'; knob.position.set(hardwareX, height * .52, .11); knob.castShadow = true; group.add(knob)
  }
  const oppositeFace = new THREE.Group()
  oppositeFace.name = 'Opposite door face'
  oppositeFace.position.z = .08
  oppositeFace.scale.z = -1
  for (const detail of [...group.children]) {
    if (detail.name.startsWith('Door leaf')) continue
    oppositeFace.add(detail.clone())
  }
  group.add(oppositeFace)
  void top
}

/** The model's back plane is local Z=0; +Z faces into the room. */
export function buildDoorLocal(style: DoorStyle, widthMm: number, heightMm: number, options: { includeWallFill?: boolean } = {}): THREE.Group {
  const group = new THREE.Group(), width = widthMm / 1000, height = heightMm / 1000
  if (style.category === 'archways') { makeArchway(group, width, height, style, options.includeWallFill ?? true); return group }
  const trim = style.frame === 'classic' ? .075 : .055, depth = .13
  const side = style.sidelightMm ? style.sidelightMm / 1000 : 0
  addBox(group, trim, height, depth, -width / 2 + trim / 2, height / 2, depth / 2, style.frameFinish, 'Left jamb')
  addBox(group, trim, height, depth, width / 2 - trim / 2, height / 2, depth / 2, style.frameFinish, 'Right jamb')
  addBox(group, width, trim, depth, 0, height - trim / 2, depth / 2, style.frameFinish, 'Head jamb')
  if (style.leafCount === 2) {
    const leafWidth = (width - trim * 2) / 2
    addLeaf(group, style, -leafWidth / 2, leafWidth, height - trim * .85, 0, style.construction === 'glazed')
    addLeaf(group, style, leafWidth / 2, leafWidth, height - trim * .85, 1, style.construction === 'glazed')
    addBox(group, .018, height - trim * 1.6, .045, 0, (height - trim * 1.6) / 2, .047, style.frameFinish, 'Meeting stile')
  } else {
    const leafWidth = width - trim * 2 - side * 2, centerX = (style.sidelightMm ? 0 : 0)
    addLeaf(group, style, centerX, leafWidth, height - trim * .85, 0, style.construction === 'glazed')
    if (side > 0) {
      const paneWidth = side - trim * .55, paneHeight = height - trim * 2.5
      for (const x of [-width / 2 + trim + side / 2, width / 2 - trim - side / 2]) {
        addBox(group, paneWidth, paneHeight, .01, x, height / 2, .04, 'GLASS', 'Sidelight')
        addBox(group, .018, paneHeight, .02, x, height / 2, .052, style.frameFinish, 'Sidelight mullion')
      }
    }
  }
  for (const part of group.children) part.position.z -= .09
  return group
}
