import * as THREE from 'three'
import type { Project } from '../domain/types'
import { prepareFurniture } from '../assets/models'
import { prepareWallModels } from '../assets/wallModels'
import { prepareDoorModels } from '../assets/doorModels'
import { canonicalPose } from '../scene/camera'
import { createWorld } from '../scene/world'

/** Build a static GLB from the same room geometry used by the editor. */
export async function exportRoomGlb(project: Project): Promise<Blob> {
  await prepareFurniture(project.instances.map((item) => item.conceptId))
  if ((project.wallObjects?.length ?? 0) > 0 || project.room.openings.some((opening) => opening.type === 'window')) {
    await prepareWallModels()
  }
  if (project.room.openings.some((opening) => opening.type === 'door' || opening.type === 'archway')) {
    await prepareDoorModels()
  }

  const world = createWorld(project, 'isometric', 1, 1000, 750, null, canonicalPose(), false, true)
  try {
    // Keep the room complete and exportable in Blender or another GLB viewer.
    world.wallGroups.forEach((group) => { group.visible = true })

    // GLTF has no native equivalent for the editor's line overlays or hemisphere light.
    const editorOnly: THREE.Object3D[] = []
    world.scene.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof THREE.HemisphereLight) editorOnly.push(object)
    })
    editorOnly.forEach((object) => object.parent?.remove(object))

    world.camera.name = 'Nook room camera'
    world.scene.add(world.camera)

    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
    const result = await new GLTFExporter().parseAsync(world.scene, { binary: true, onlyVisible: true })
    if (typeof result === 'string' || !(result instanceof ArrayBuffer)) throw new Error('Could not create a binary GLB file.')
    return new Blob([result], { type: 'model/gltf-binary' })
  } finally {
    world.dispose()
  }
}
