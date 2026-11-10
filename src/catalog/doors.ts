export type DoorCategory = 'main' | 'interior' | 'archways'
export type DoorConstruction = 'plank' | 'six-panel' | 'two-panel' | 'glazed' | 'archway'
export type DoorStyle = {
  id: string
  name: string
  category: DoorCategory
  description: string
  inspiration: string
  materialsDescription: string
  widthMm: number
  heightMm: number
  construction: DoorConstruction
  leafCount: 1 | 2
  /** Clear sidelights on each side of a single leaf, in millimeters. */
  sidelightMm?: number
  frame: 'square' | 'arch' | 'classic'
  leafFinish: string
  frameFinish: string
  hardwareFinish: string
}

/** Procedural interpretations of the supplied door and archway references. */
export const DOOR_STYLES: readonly DoorStyle[] = Object.freeze([
  { id: 'DR-MAIN-WOOD-01', name: 'Walnut plank entry', category: 'main', description: 'A warm timber entry door with horizontal boards and a long dark pull.', inspiration: 'Inspired by the rich horizontal-grain entry door in the reference images.', materialsDescription: 'Walnut-look door leaf, timber casing and matte dark hardware.', widthMm: 1000, heightMm: 2200, construction: 'plank', leafCount: 1, frame: 'square', leafFinish: 'WAL', frameFinish: 'ESP', hardwareFinish: 'CHA' },
  { id: 'DR-MAIN-SIDELIGHT-01', name: 'Entry with sidelights', category: 'main', description: 'A modern entry with one broad timber leaf and two narrow glazed sidelights.', inspiration: 'Inspired by the contemporary entrance with tall glazed panels at either side.', materialsDescription: 'Dark timber-look leaf and frame with glazed side panels and a long pull.', widthMm: 1800, heightMm: 2200, construction: 'plank', leafCount: 1, sidelightMm: 350, frame: 'square', leafFinish: 'ESP', frameFinish: 'CHA', hardwareFinish: 'CHA' },
  { id: 'DR-MAIN-DOUBLE-01', name: 'Glazed double entry', category: 'main', description: 'A pair of timber doors with divided glass panels and lower raised panels.', inspiration: 'Inspired by the paired glazed timber entry doors in the reference images.', materialsDescription: 'Walnut-look paired leaves, clear glass-look panes and dark hardware.', widthMm: 1800, heightMm: 2200, construction: 'glazed', leafCount: 2, frame: 'classic', leafFinish: 'ESP', frameFinish: 'ESP', hardwareFinish: 'CHA' },
  { id: 'DR-INT-WHITE-06', name: 'White six-panel door', category: 'interior', description: 'A classic white interior door with six raised panels and a light casing.', inspiration: 'Inspired by the traditional six-panel white interior door in the references.', materialsDescription: 'Warm off-white painted leaf and casing with muted brass hardware.', widthMm: 900, heightMm: 2100, construction: 'six-panel', leafCount: 1, frame: 'classic', leafFinish: 'OFF', frameFinish: 'OFF', hardwareFinish: 'GLD' },
  { id: 'DR-INT-DARK-06', name: 'Dark six-panel door', category: 'interior', description: 'A deep espresso six-panel door with a quiet metallic handle.', inspiration: 'Inspired by the dark, raised-panel interior door in the reference images.', materialsDescription: 'Espresso-painted leaf and casing with muted brass hardware.', widthMm: 900, heightMm: 2100, construction: 'six-panel', leafCount: 1, frame: 'classic', leafFinish: 'ESP', frameFinish: 'ESP', hardwareFinish: 'GLD' },
  { id: 'DR-INT-WALNUT-02', name: 'Walnut two-panel door', category: 'interior', description: 'A refined walnut interior door with two broad recessed panels and a long pull.', inspiration: 'Inspired by the richly grained, two-panel door shown open in the references.', materialsDescription: 'Walnut-look leaf and casing with matte dark hardware.', widthMm: 900, heightMm: 2100, construction: 'two-panel', leafCount: 1, frame: 'square', leafFinish: 'WAL', frameFinish: 'ESP', hardwareFinish: 'CHA' },
  { id: 'DR-ARCH-ROUND-01', name: 'Soft round archway', category: 'archways', description: 'A clean, softly rounded opening with a simple matching casing.', inspiration: 'Inspired by the light, rounded archway in the reference images.', materialsDescription: 'Cream-painted arch casing; open passage with no door leaf.', widthMm: 1200, heightMm: 2300, construction: 'archway', leafCount: 1, frame: 'arch', leafFinish: 'OFF', frameFinish: 'OFF', hardwareFinish: 'OFF' },
  { id: 'DR-ARCH-CLASSIC-01', name: 'Classic cased archway', category: 'archways', description: 'A tall arched opening with a wider, more traditional casing.', inspiration: 'Inspired by the dressed classical arch opening with broad trim and pilaster-like sides.', materialsDescription: 'Off-white classic casing; open passage with no door leaf.', widthMm: 1500, heightMm: 2400, construction: 'archway', leafCount: 1, frame: 'classic', leafFinish: 'OFF', frameFinish: 'OFF', hardwareFinish: 'OFF' },
  { id: 'DR-ARCH-MODERN-01', name: 'Minimal arch opening', category: 'archways', description: 'A taller, understated arch with a slim timber-look frame.', inspiration: 'Inspired by the minimal, softly rounded opening with a pale wood frame.', materialsDescription: 'Light oak-look arch casing; open passage with no door leaf.', widthMm: 1100, heightMm: 2400, construction: 'archway', leafCount: 1, frame: 'arch', leafFinish: 'OAK', frameFinish: 'OAK', hardwareFinish: 'OAK' },
])

export const getDoorStyle = (id: string) => DOOR_STYLES.find((style) => style.id === id)
export const getDoorCategory = (id: string) => getDoorStyle(id)?.category
