import type { DragEvent } from 'react'
import { getConcept } from '../catalog'
import { getWallConcept } from '../catalog/wall'
import { clearFurnitureDragImage, FURNITURE_DRAG_TYPE, hideFurnitureDragImage, setActiveFurnitureDrag } from '../domain/furnitureDrag'
import { encodeWallDrag, setActiveWallDrag, WALL_DRAG_TYPE, type WallCatalogDrag } from '../domain/wallDrag'
import { FurnitureThumbnail } from './FurnitureThumbnail'
import { Icon } from './Icon'
import { WallThumbnail } from './WallThumbnail'

const wallTv = getWallConcept('TV-WALL-01')
const floorItems = [getConcept(2, 'ELC-ELC-01'), getConcept(2, 'ELC-ELC-02')].filter((item) => item !== undefined)

export function ElectronicsPanel({ disabled, onBack, onAddFloor, onAddWall }: {
  disabled: boolean
  onBack: () => void
  onAddFloor: (id: string) => void
  onAddWall: (id: string) => void
}) {
  function startWallDrag(event: DragEvent<HTMLButtonElement>, id: string) {
    const item: WallCatalogDrag = { kind: 'wall', id }
    setActiveWallDrag(item)
    event.dataTransfer.setData(WALL_DRAG_TYPE, encodeWallDrag(item))
    event.dataTransfer.effectAllowed = 'copy'
    hideFurnitureDragImage(event.dataTransfer)
  }
  function endWallDrag() { setActiveWallDrag(null); clearFurnitureDragImage() }

  return <>
    <button className="button back-button" onClick={onBack}><Icon name="back" size={17} />All objects</button>
    <div className="catalog-items" aria-label="Electronics">
      {wallTv && <button className="catalog-tile" type="button" disabled={disabled}
        aria-label={'Add ' + wallTv.name + ' to a wall'} draggable={!disabled}
        onDragStart={(event) => startWallDrag(event, wallTv.id)} onDragEnd={endWallDrag}
        onClick={() => onAddWall(wallTv.id)}>
        <WallThumbnail preview={{ kind: 'wall', concept: wallTv }} />
      </button>}
      {floorItems.map((concept) => <button key={concept.id} className="catalog-tile" type="button" disabled={disabled}
        aria-label={'Add ' + concept.name + ' to the room'} draggable={!disabled}
        onDragStart={(event) => { setActiveFurnitureDrag(concept.id); event.dataTransfer.setData(FURNITURE_DRAG_TYPE, concept.id); event.dataTransfer.effectAllowed = 'copy'; hideFurnitureDragImage(event.dataTransfer) }}
        onDragEnd={() => { setActiveFurnitureDrag(null); clearFurnitureDragImage() }}
        onClick={() => onAddFloor(concept.id)}>
        <FurnitureThumbnail concept={concept} fallback="tv" />
      </button>)}
    </div>
  </>
}
