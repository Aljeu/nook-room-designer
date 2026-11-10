import { useState } from 'react'
import type { WallConcept } from '../catalog/wall'
import { Icon } from './Icon'
import { preparedThumbnailUrl } from './preparedThumbnail'
import { wallThumbnailKey, windowThumbnailKey } from './thumbnailKeys'

type Preview = { kind:'wall'; concept:WallConcept } | { kind:'window'; id:string; widthMm:number; heightMm:number; sillMm:number }
export function WallThumbnail({preview}: {preview:Preview}) {
  const url=preparedThumbnailUrl(preview.kind==='wall'?wallThumbnailKey(preview.concept):windowThumbnailKey(preview))
  const [failed,setFailed]=useState<string|null>(null)
  return url && failed!==url ? <img src={url} alt="" draggable={false} width="64" height="64" onError={()=>setFailed(url)}/> : preview.kind==='wall'&&preview.concept.id==='TV-WALL-01'?<Icon name="tv" size={42}/>:preview.kind==='wall'&&preview.concept.category==='appliance'?<Icon name="airVent" size={42}/>:<span aria-hidden="true">◇</span>
}
