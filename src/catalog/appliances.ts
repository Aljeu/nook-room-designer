import type { CatalogConcept } from '../domain/types'

/** Floor-mounted appliances; wall-mounted ventilation models live in the wall catalog. */
export const towerAcConcept: Omit<CatalogConcept, 'available' | 'footprint' | 'finishes'> = {
  id: 'VNT-APP-01',
  name: 'Tower-type AC',
  category: 'VNT',
  style: 'APP',
  dimensions: { widthMm: 460, depthMm: 420, heightMm: 1700 },
  description: 'A slim floor-standing air conditioner with separate upper and lower air outlets.',
  footprintIntent: 'Full cabinet footprint including base',
  wave: 'APPLIANCE-01',
}

export const standFanConcept: Omit<CatalogConcept, 'available' | 'footprint' | 'finishes'> = {
  id: 'VNT-APP-02',
  name: 'Stand fan',
  category: 'VNT',
  style: 'APP',
  dimensions: { widthMm: 460, depthMm: 430, heightMm: 1450 },
  description: 'A pedestal fan with a guarded three-blade head and weighted circular base.',
  footprintIntent: 'Full footprint including the weighted base',
  wave: 'APPLIANCE-02',
}
