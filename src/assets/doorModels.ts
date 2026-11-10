import * as THREE from 'three'
import type { Room, Opening } from '../domain/types'
import { getDoorStyle, type DoorStyle } from '../catalog/doors'
import { wallAttachmentPose } from '../geometry/wallAttachment'

type DoorModule = typeof import('./doors')
let ready: DoorModule | undefined
let pending: Promise<DoorModule> | undefined
const archWallMaterial = new THREE.MeshStandardMaterial({ color: '#eeeae1', roughness: 1 })

export async function prepareDoorModels() {
  if (ready) return
  if (!pending) pending = import('./doors').then((module) => { ready = module; pending = undefined; return module }, (error) => { pending = undefined; throw error })
  await pending
}

const legacyStyle: DoorStyle = { id: 'DR-LEGACY-PLAIN', name: 'Plain door', category: 'interior', description: 'A simple painted door.', inspiration: 'A straightforward interior opening.', materialsDescription: 'Painted leaf and casing.', widthMm: 900, heightMm: 2100, construction: 'two-panel', leafCount: 1, frame: 'square', leafFinish: 'OFF', frameFinish: 'OFF', hardwareFinish: 'CHA' }
function styleFor(opening: Opening) { const base = opening.type !== 'window' && opening.styleId ? getDoorStyle(opening.styleId) ?? legacyStyle : legacyStyle; return opening.type !== 'window' && opening.finish ? { ...base, leafFinish: opening.finish, frameFinish: opening.finish } : base }
function dimensions(opening: Opening) { return { widthMm: opening.widthMm, heightMm: opening.heightMm } }

export function buildDoorPreview(style: DoorStyle, widthMm = style.widthMm, heightMm = style.heightMm, options: { includeWallFill?: boolean } = {}) {
  if (!ready) throw new Error('Door models are not prepared')
  return ready.buildDoorLocal(style, widthMm, heightMm, options)
}

export function applyDoorObject(group: THREE.Group, room: Room, opening: Exclude<Opening, { type: 'window' }>) {
  const { widthMm, heightMm } = dimensions(opening)
  const pose = wallAttachmentPose(room, { wall: opening.wall, offsetMm: opening.offsetMm, bottomMm: opening.sillMm, widthMm, heightMm, depthMm: 130 })
  const matrix = new THREE.Matrix4().makeBasis(new THREE.Vector3(pose.tangent.x * (opening.type === 'door' && opening.hinge === 'max' ? -1 : 1), 0, pose.tangent.z * (opening.type === 'door' && opening.hinge === 'max' ? -1 : 1)), new THREE.Vector3(0, 1, 0), new THREE.Vector3(pose.inward.x, 0, pose.inward.z))
  matrix.setPosition(pose.originMm.x / 1000, pose.originMm.y / 1000, pose.originMm.z / 1000)
  group.matrixAutoUpdate = false; group.matrix.copy(matrix); group.matrixWorldNeedsUpdate = true
  group.userData.instanceId = opening.id; group.userData.opening = true; group.userData.archway = opening.type === 'archway'
  group.traverse((object) => { if (object instanceof THREE.Mesh && object.name === 'Arch fill') object.material = archWallMaterial })
}

export function buildDoorObject(room: Room, opening: Exclude<Opening, { type: 'window' }>) {
  const { widthMm, heightMm } = dimensions(opening), group = buildDoorPreview(styleFor(opening), widthMm, heightMm)
  group.name = `door:${opening.type}:${opening.styleId ?? 'legacy'}:${widthMm}:${heightMm}:${opening.finish ?? ''}`
  applyDoorObject(group, room, opening)
  return group
}

export function disposeDoorModel(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
  })
}
