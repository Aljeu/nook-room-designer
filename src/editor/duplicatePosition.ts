import type { CatalogConcept, FurnitureInstance, Project } from '../domain/types'
import { validateProjectSpatial } from '../geometry'

/** Try right, left, down, then up, testing integer centers before choosing one. */
export function duplicateOffset(project: Project, source: FurnitureInstance, concept: CatalogConcept): [number, number] {
  const degrees = source.rotationDegrees ?? source.quarterTurn * 90
  const quarter = degrees % 90 === 0 ? ((Math.round(degrees / 90) % 4) + 4) % 4 : null
  const angle = degrees * Math.PI / 180
  const cos = quarter === null ? Math.abs(Math.cos(angle)) : quarter % 2 === 0 ? 1 : 0
  const sin = quarter === null ? Math.abs(Math.sin(angle)) : quarter % 2 === 0 ? 0 : 1
  const { widthMm, depthMm } = concept.dimensions
  const dx = Math.ceil(cos * widthMm + sin * depthMm + 150)
  const dz = Math.ceil(sin * widthMm + cos * depthMm + 150)
  const attempts: [number, number][] = [[dx, 0], [-dx, 0], [0, dz], [0, -dz]]
  return attempts.find(([x, z]) => {
    const candidate = { ...source, centerXMm: source.centerXMm + x, centerZMm: source.centerZMm + z }
    const test = { ...project, instances: project.instances.map((item) => item.id === source.id ? candidate : item) }
    return !validateProjectSpatial(test).some((issue) => issue.severity === 'hard')
  }) ?? [0, 0]
}
