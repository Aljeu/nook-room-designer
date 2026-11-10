import { useState } from 'react'
import type { CatalogConcept } from '../domain/types'
import { Icon, type IconName } from './Icon'
import { furnitureThumbnailKey } from './thumbnailKeys'
import { preparedThumbnailUrl } from './preparedThumbnail'

export function FurnitureThumbnail({ concept, fallback }: { concept: CatalogConcept; fallback: IconName }) {
  const url = preparedThumbnailUrl(furnitureThumbnailKey(concept))
  const [failed, setFailed] = useState<string | null>(null)
  return url && failed !== url ? <img src={url} alt="" draggable={false} onError={() => setFailed(url)} /> : <Icon name={fallback} size={44} />
}
