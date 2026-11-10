import type { DragEvent } from 'react'
import { getConcept } from '../catalog'
import { WALL_CONCEPTS } from '../catalog/wall'
import { clearFurnitureDragImage, FURNITURE_DRAG_TYPE, hideFurnitureDragImage, setActiveFurnitureDrag } from '../domain/furnitureDrag'
import { encodeWallDrag, setActiveWallDrag, WALL_DRAG_TYPE, type WallCatalogDrag } from '../domain/wallDrag'
import { FurnitureThumbnail } from './FurnitureThumbnail'
import { Icon } from './Icon'
import { WallThumbnail } from './WallThumbnail'

const tower = getConcept(2, 'VNT-APP-01')
const standFan = getConcept(2, 'VNT-APP-02')
const applianceOrder = ['AC-SPLIT-01', 'AC-WINDOW-01', 'VNT-APP-01', 'VENT-WALL-01', 'VNT-APP-02', 'FAN-WALL-01'] as const

export function AppliancePanel({ disabled, onBack, onAddFloor, onAddWall }: {
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
    <div className="catalog-items" aria-label="Ventilation and AC">
      {applianceOrder.map((id) => {
        const floorConcept = id === 'VNT-APP-01' ? tower : id === 'VNT-APP-02' ? standFan : undefined
        if (floorConcept) return <button key={id} className="catalog-tile" type="button" disabled={disabled}
          aria-label={'Add ' + floorConcept.name + ' to the floor'} draggable={!disabled}
          onDragStart={(event) => { setActiveFurnitureDrag(floorConcept.id); event.dataTransfer.setData(FURNITURE_DRAG_TYPE, floorConcept.id); event.dataTransfer.effectAllowed = 'copy'; hideFurnitureDragImage(event.dataTransfer) }}
          onDragEnd={() => setActiveFurnitureDrag(null)} onClick={() => onAddFloor(floorConcept.id)}>
          <FurnitureThumbnail concept={floorConcept} fallback="airVent" />
        </button>
        const concept = WALL_CONCEPTS.find((item) => item.id === id)
        if (!concept) return null
        return <button key={id} className="catalog-tile" type="button" disabled={disabled}
          aria-label={'Add ' + concept.name + ' to a wall'} draggable={!disabled}
          onDragStart={(event) => startWallDrag(event, id)} onDragEnd={endWallDrag} onClick={() => onAddWall(id)}>
          <WallThumbnail preview={{ kind: 'wall', concept }} />
        </button>
      })}
    </div>
  </>
}
