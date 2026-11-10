import { useState, type DragEvent } from 'react'
import { DOOR_STYLES, type DoorCategory, type DoorStyle } from '../catalog/doors'
import type { IconName } from './Icon'
import { Icon } from './Icon'
import { DoorThumbnail } from './DoorThumbnail'
import { WALL_DRAG_TYPE, encodeWallDrag, setActiveWallDrag, type WallCatalogDrag } from '../domain/wallDrag'
import { clearFurnitureDragImage, hideFurnitureDragImage } from '../domain/furnitureDrag'

const categories: { id: DoorCategory; name: string; detail: string; icon: IconName }[] = [
  { id: 'main', name: 'Main doors', detail: '', icon: 'mainDoor' },
  { id: 'interior', name: 'Interior doors', detail: '', icon: 'interiorDoor' },
  { id: 'archways', name: 'Archways & openings', detail: '', icon: 'archDoor' },
]

export function DoorsPanel({ onAdd, disabled }: { onAdd: (styleId: string) => void; disabled: boolean }) {
  const [category, setCategory] = useState<DoorCategory | null>(null)
  const styles = category ? DOOR_STYLES.filter((style) => style.category === category) : []
  function dragStart(event: DragEvent<HTMLButtonElement>, style: DoorStyle) {
    const item: WallCatalogDrag = { kind: 'door', id: style.id }
    setActiveWallDrag(item); event.dataTransfer.setData(WALL_DRAG_TYPE, encodeWallDrag(item)); event.dataTransfer.effectAllowed = 'copy'; hideFurnitureDragImage(event.dataTransfer)
  }
  function dragEnd() { setActiveWallDrag(null); clearFurnitureDragImage() }

  return <div className="door-panel">
    {category ? <>
      <button className="button back-button" onClick={() => setCategory(null)}><Icon name="back" size={17} />All door types</button>
      <div className="catalog-items door-catalog-items" aria-label={categories.find((item) => item.id === category)?.name}>
        {styles.map((style) => <button key={style.id} className="catalog-tile door-catalog-tile" type="button" disabled={disabled} aria-label={disabled ? 'Doorway limit reached' : `Add ${style.name} to a wall`} title={`${style.name} · ${style.widthMm / 10} × ${style.heightMm / 10} cm`} draggable={!disabled} onDragStart={(event) => dragStart(event, style)} onDragEnd={dragEnd} onClick={() => onAdd(style.id)}>
          <span className="door-thumbnail-visual"><DoorThumbnail style={style} /></span>
        </button>)}
      </div>
    </> : <div className="category-list door-category-list">{categories.map((item) => <button key={item.id} className="category-button" aria-label={item.name} title={item.name} onClick={() => setCategory(item.id)}><Icon name={item.icon} size={25} /><span>{item.name}</span></button>)}</div>}
  </div>
}
