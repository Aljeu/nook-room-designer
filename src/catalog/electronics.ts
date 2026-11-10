import type { CatalogConcept } from '../domain/types'

export const electronicsConcepts: Omit<CatalogConcept, 'available' | 'footprint' | 'finishes'>[] = [
  {
    id: 'ELC-ELC-01',
    name: 'Console TV',
    category: 'ELC',
    style: 'ELC',
    dimensions: { widthMm: 920, depthMm: 360, heightMm: 640 },
    description: 'A slim flat-screen television with two low-profile feet for a media console.',
    footprintIntent: 'Screen and angled feet',
    wave: 'ELECTRONICS-01',
  },
  {
    id: 'ELC-ELC-02',
    name: 'Open Laptop',
    category: 'ELC',
    style: 'ELC',
    dimensions: { widthMm: 330, depthMm: 250, heightMm: 260 },
    description: 'A compact open laptop with a dark display, keyboard and broad trackpad.',
    footprintIntent: 'Open screen and base',
    wave: 'ELECTRONICS-01',
  },
]
