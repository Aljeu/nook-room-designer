import type { CatalogConcept } from '../domain/types'

export const plantConcepts = [
  { id: 'PLT-PLT-01', name: 'Fiddle-leaf Fig', category: 'PLT', style: 'PLT', dimensions: { widthMm: 900, depthMm: 900, heightMm: 1800 }, description: 'Broad leaves give this potted tree a bold, sculptural presence.', footprintIntent: 'Planter and full leaf spread', wave: 'PLANTS-01' },
  { id: 'PLT-PLT-02', name: 'Areca Palm', category: 'PLT', style: 'PLT', dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1900 }, description: 'Feathery fronds bring a light, leafy silhouette to an empty corner.', footprintIntent: 'Planter and full frond spread', wave: 'PLANTS-01' },
  { id: 'PLT-PLT-03', name: 'Rubber Tree on Stand', category: 'PLT', style: 'PLT', dimensions: { widthMm: 750, depthMm: 750, heightMm: 1700 }, description: 'Glossy-looking leaves and a raised planter give this tree a tidy, upright presence.', footprintIntent: 'Stand and full leaf spread', wave: 'PLANTS-01' },
] as const satisfies readonly Omit<CatalogConcept, 'available'>[]
