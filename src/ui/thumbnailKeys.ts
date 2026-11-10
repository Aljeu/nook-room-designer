import { defaultFinishes } from '../catalog'
import type { CatalogConcept } from '../domain/types'
import type { WallConcept } from '../catalog/wall'
import type { DoorStyle } from '../catalog/doors'

const ordered = (value: Readonly<Record<string, string>>) => Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
export const furnitureThumbnailKey = (concept: CatalogConcept) => JSON.stringify(['furniture', concept.id, concept.dimensions, ordered(defaultFinishes(concept))])
export const wallThumbnailKey = (concept: WallConcept) => JSON.stringify(['wall', concept.id, concept.widthMm, concept.heightMm, concept.depthMm, ordered(concept.defaults)])
export const windowThumbnailKey = (style: {id:string; widthMm:number; heightMm:number; sillMm:number}) => JSON.stringify(['window', style.id, style.widthMm, style.heightMm, style.sillMm])
export const doorThumbnailKey = (style: DoorStyle) => JSON.stringify(['door', style.id, style.widthMm, style.heightMm, style.construction, style.leafCount, style.sidelightMm ?? null, style.frame, style.leafFinish, style.frameFinish, style.hardwareFinish])
