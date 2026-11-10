import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAvailableConcepts } from '../catalog'
import { WALL_CONCEPTS, WINDOW_STYLES } from '../catalog/wall'
import { DOOR_STYLES } from '../catalog/doors'
import { furnitureThumbnailKey, wallThumbnailKey, windowThumbnailKey, doorThumbnailKey } from './thumbnailKeys'
import { preparedThumbnailEntries, preparedThumbnailUrl } from './preparedThumbnail'
import { FurnitureThumbnail } from './FurnitureThumbnail'

describe('prepared catalogue previews', () => {
  it('covers every available furniture, wall, window and door definition exactly once', () => {
    const keys = [
      ...getAvailableConcepts().map(furnitureThumbnailKey),
      ...WALL_CONCEPTS.map(wallThumbnailKey),
      ...WINDOW_STYLES.map(windowThumbnailKey),
      ...DOOR_STYLES.map(doorThumbnailKey),
    ]
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(preparedThumbnailEntries.map((item) => item.key))).toEqual(new Set(keys))
    expect(keys.every((key) => !!preparedThumbnailUrl(key))).toBe(true)
  })
  it('resolves paths relative to the configured base and rejects a stale key', () => {
    const key = furnitureThumbnailKey(getAvailableConcepts()[0])
    expect(preparedThumbnailUrl(key, '/nook/')).toMatch(/^\/nook\/thumbnails\/furniture\//)
    expect(preparedThumbnailUrl(key, './')).toMatch(/^\.\.\/thumbnails\/furniture\//)
    expect(preparedThumbnailUrl('unknown')).toBeUndefined()
  })
  it('renders a decorative image for a matching entry and a fallback for a changed definition', () => {
    const concept = getAvailableConcepts()[0]
    expect(renderToStaticMarkup(<FurnitureThumbnail concept={concept} fallback="sofa" />)).toContain('alt=""')
    const stale = { ...concept, dimensions: { ...concept.dimensions, widthMm: concept.dimensions.widthMm + 1 } }
    const html = renderToStaticMarkup(<FurnitureThumbnail concept={stale} fallback="sofa" />)
    expect(html).not.toContain('<img')
    expect(html).toContain('<svg')
  })
})
