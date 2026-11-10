import { useState } from 'react'
import type { DoorStyle } from '../catalog/doors'
import { Icon } from './Icon'
import { doorThumbnailKey } from './thumbnailKeys'
import { preparedThumbnailUrl } from './preparedThumbnail'

export function DoorThumbnail({ style }: { style: DoorStyle }) {
  const url = preparedThumbnailUrl(doorThumbnailKey(style))
  const [failed, setFailed] = useState<string | null>(null)
  return url && failed !== url ? <img src={url} alt="" draggable={false} width="64" height="64" onError={() => setFailed(url)} /> : <Icon name="door" size={38} />
}
