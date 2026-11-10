export const WALL_DRAG_TYPE = 'application/x-nook-wall-item'

export type WallCatalogDrag = { kind: 'wall'; id: string } | { kind: 'window'; id: string } | { kind: 'door'; id: string }

let active: WallCatalogDrag | null = null

export function setActiveWallDrag(item: WallCatalogDrag | null) { active = item }
export function getActiveWallDrag() { return active }
export function encodeWallDrag(item: WallCatalogDrag) { return `${item.kind}:${item.id}` }
export function decodeWallDrag(value: string): WallCatalogDrag | null {
  const split = value.indexOf(':')
  if (split < 0) return null
  const kind = value.slice(0, split), id = value.slice(split + 1)
  return (kind === 'wall' || kind === 'window' || kind === 'door') && id ? { kind, id } : null
}

