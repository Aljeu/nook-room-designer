import type { CatalogConcept } from '../domain/types'

export const nightstandConcepts: Omit<CatalogConcept, 'available' | 'footprint' | 'finishes'>[] = [
  {
    id: 'NST-NSD-01',
    name: 'Mid-century Walnut Nightstand',
    category: 'NST',
    style: 'NSD',
    dimensions: { widthMm: 540, depthMm: 470, heightMm: 590 },
    description: 'A warm walnut cabinet with two clean drawer fronts and splayed timber legs.',
    footprintIntent: 'Cabinet and splayed legs',
    wave: 'NIGHTSTANDS-01',
  },
  {
    id: 'NST-NSD-02',
    name: 'Classic Two-drawer Nightstand',
    category: 'NST',
    style: 'NSD',
    dimensions: { widthMm: 580, depthMm: 480, heightMm: 610 },
    description: 'A painted two-drawer bedside cabinet with a softly overhanging top and tapered legs.',
    footprintIntent: 'Cabinet and tapered legs',
    wave: 'NIGHTSTANDS-01',
  },
  {
    id: 'NST-NSD-03',
    name: 'Cane-front Shelf Nightstand',
    category: 'NST',
    style: 'NSD',
    dimensions: { widthMm: 560, depthMm: 450, heightMm: 570 },
    description: 'A rounded wood frame pairs a woven drawer with an open lower shelf.',
    footprintIntent: 'Full side panels and open shelf',
    wave: 'NIGHTSTANDS-01',
  },
  {
    id: 'NST-NSD-04',
    name: 'Modern Three-drawer Nightstand',
    category: 'NST',
    style: 'NSD',
    dimensions: { widthMm: 520, depthMm: 450, heightMm: 560 },
    description: 'A compact, floor-standing cabinet with three simple drawers and discreet pulls.',
    footprintIntent: 'Full cabinet envelope',
    wave: 'NIGHTSTANDS-01',
  },
]
