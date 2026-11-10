/** Portable design data. All lengths and positions are integer millimeters. */
export type Wall = 'N' | 'E' | 'S' | 'W'
export type RoomShape = 'rectangle' | 'square' | 'l-shape' | 'd-shape'
export type QuarterTurn = 0 | 1 | 2 | 3
export type LampLightColor = 'daylight' | 'white' | 'warm'
export type ObjectComment = { id: string; text: string; createdAt?: string; resolvedAt?: string }
export type CommentEntry = string | ObjectComment
export const WINDOW_TREATMENT_COLORS = ['LIN', 'SAG', 'BLU', 'OAK', 'WAL', 'OFF', 'OAT', 'CHA', 'BRZ', 'CRM', 'ROSE', 'RUST', 'OCHR', 'FOREST'] as const
export type WindowTreatmentColor = typeof WINDOW_TREATMENT_COLORS[number]
export type OpeningBase = { id: string; wall: Wall; offsetMm: number; widthMm: number; heightMm: number; sillMm: number; comments?: CommentEntry[] }
export type Door = OpeningBase & { type: 'door'; hinge: 'min' | 'max'; styleId?: string; finish?: WindowTreatmentColor | 'ESP' }
export type ArchwayOpening = OpeningBase & { type: 'archway'; styleId: string; finish?: WindowTreatmentColor | 'ESP' }
export type WindowOpening = OpeningBase & { type: 'window'; styleId?: string; treatment?: 'blinds' | 'curtains'; treatmentColor?: WindowTreatmentColor; breezeEnabled?: boolean }
export type Opening = Door | ArchwayOpening | WindowOpening
export type Room = { id: string; widthMm: number; depthMm: number; heightMm: number; openings: Opening[]; shape?: RoomShape }
export type FurnitureInstance = { id: string; conceptId: string; centerXMm: number; centerZMm: number; quarterTurn: QuarterTurn; rotationDegrees?: number; flipHorizontal?: boolean; flipVertical?: boolean; elevationMm?: number; breezeEnabled?: boolean; lampOn?: boolean; lampLight?: LampLightColor; lampIntensity?: number; finishes: Record<string, string>; comments?: CommentEntry[] }
export type WallObject = { id: string; conceptId: string; wall: Wall; offsetMm: number; bottomMm: number; lampOn?: boolean; lampLight?: LampLightColor; lampIntensity?: number; finishes: Record<string, string>; comments?: CommentEntry[] }
export type Project = { id: string; name: string; room: Room; instances: FurnitureInstance[]; wallObjects?: WallObject[] }
export type ProjectEnvelope = { format: 'nook-project'; formatVersion: 1 | 2 | 3; catalogRevision: 2; project: Project }
export type Dimensions = { widthMm: number; depthMm: number; heightMm: number }
export type Footprint = { kind: 'rectangle' } | { kind: 'roundedRectangle'; radiusMm: number } | { kind: 'circle'; radiusMm: number } | { kind: 'polygon'; vertices: readonly { xMm: number; zMm: number }[] }
export type FinishRule = { allowed: readonly string[]; default: string }
export type CatalogConcept = {
  id: string; name: string; category: string; style: string; dimensions: Dimensions;
  description: string; footprintIntent: string; wave: string; available: boolean;
  /** Only authored proof assets have implementable shape and finish definitions. */
  footprint?: Footprint; finishes?: Readonly<Record<string, FinishRule>>
}
