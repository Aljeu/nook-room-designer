import { useState, type DragEvent as ReactDragEvent } from 'react'
import { WALL_CONCEPTS, WINDOW_STYLES, getWallConcept } from '../catalog/wall'
import type { IconName } from './Icon'
import { Icon } from './Icon'
import type { Project, Wall, WallObject, WindowOpening } from '../domain/types'
import { MAX_INSTANCES } from '../domain/constants'
import { validateWallAttachment } from '../geometry/wallAttachment'
import { openingBasis, validateProjectSpatial } from '../geometry'
import { WallThumbnail } from './WallThumbnail'
import { WALL_DRAG_TYPE, setActiveWallDrag, encodeWallDrag, type WallCatalogDrag } from '../domain/wallDrag'
import { clearFurnitureDragImage, hideFurnitureDragImage } from '../domain/furnitureDrag'

const walls: Wall[] = ['N', 'E', 'S', 'W']
type WallCategory = 'windows' | 'panels' | 'lights' | 'art' | 'mirrors' | 'woven'
const categories: { id: WallCategory; name: string; icon: IconName }[] = [
  { id: 'windows', name: 'Windows', icon: 'window' },
  { id: 'panels', name: 'Wall panels', icon: 'panel' },
  { id: 'lights', name: 'Wall lights', icon: 'wallLamp' },
  { id: 'art', name: 'Wall art', icon: 'wallArt' },
  { id: 'mirrors', name: 'Mirrors', icon: 'mirror' },
  { id: 'woven', name: 'Woven décor', icon: 'weave' },
]
type Props = { project: Project; select: (id: string | null) => void; addObject: (item: WallObject) => string | null; addWindow: (item: WindowOpening) => string | null; report: (message: string) => void }

export function WallPanel({ project, select, addObject: commitWallObject, addWindow: commitWindow, report }: Props) {
  const [group, setGroup] = useState<WallCategory | null>(null)
  const objectCount = project.instances.length + (project.wallObjects?.length ?? 0)
  const windowCount = project.room.openings.filter((opening) => opening.type === 'window').length
  const itemConcepts = group === 'panels' ? WALL_CONCEPTS.filter((item) => item.category === 'panel')
    : group === 'lights' ? WALL_CONCEPTS.filter((item) => item.category === 'sconce')
      : group === 'art' ? WALL_CONCEPTS.filter((item) => item.category === 'art')
        : group === 'mirrors' ? WALL_CONCEPTS.filter((item) => item.id.startsWith('MIR-'))
          : group === 'woven' ? WALL_CONCEPTS.filter((item) => item.category === 'decor' && !item.id.startsWith('MIR-')) : []

  function dragStart(event: ReactDragEvent<HTMLButtonElement>, item: WallCatalogDrag) {
    setActiveWallDrag(item)
    event.dataTransfer.setData(WALL_DRAG_TYPE, encodeWallDrag(item))
    event.dataTransfer.effectAllowed = 'copy'
    hideFurnitureDragImage(event.dataTransfer)
  }
  function dragEnd() { setActiveWallDrag(null); clearFurnitureDragImage() }

  function addWallObject(conceptId: string) {
    const concept = getWallConcept(conceptId)
    if (!concept) return
    if (objectCount >= MAX_INSTANCES) { report('This room already has 24 objects. Remove one before adding another.'); return }
    const bottomMm = Math.max(0, Math.min(1000, project.room.heightMm - concept.heightMm))
    for (const wall of walls) {
      const length = openingBasis(project.room, wall).length
      if (length <= 0) continue
      for (let offsetMm = 0; offsetMm + concept.widthMm <= length; offsetMm += 100) {
        const candidate: WallObject = { id: crypto.randomUUID(), conceptId, wall, offsetMm, bottomMm, finishes: { ...concept.defaults } }
        if (validateWallAttachment(project.room, { ...candidate, widthMm: concept.widthMm, heightMm: concept.heightMm, depthMm: concept.depthMm }).length) continue
        const overlaps = (project.wallObjects ?? []).some((other) => {
          const otherConcept = getWallConcept(other.conceptId)
          return !!otherConcept && other.wall === wall
            && offsetMm < other.offsetMm + otherConcept.widthMm && other.offsetMm < offsetMm + concept.widthMm
            && bottomMm < other.bottomMm + otherConcept.heightMm && other.bottomMm < bottomMm + concept.heightMm
        })
        if (overlaps) continue
        const error = commitWallObject(candidate)
        if (!error) select(candidate.id)
        else report(error)
        return
      }
    }
    report('No clear space for this item was found on any wall.')
  }

  function addWindow(styleId: string) {
    const style = WINDOW_STYLES.find((entry) => entry.id === styleId)
    if (!style) return
    if (windowCount >= 2) { report('This room already has two windows.'); return }
    for (const wall of walls) {
      const length = openingBasis(project.room, wall).length
      if (length <= 0) continue
      for (let offsetMm = 0; offsetMm + style.widthMm <= length; offsetMm += 100) {
        const candidate: WindowOpening = { id: crypto.randomUUID(), type: 'window', wall, offsetMm, widthMm: style.widthMm, heightMm: style.heightMm, sillMm: style.sillMm, styleId }
        const next = { ...project, room: { ...project.room, openings: [...project.room.openings, candidate] } }
        if (validateProjectSpatial(next).some((issue) => issue.severity === 'hard')) continue
        const overlaps = (project.wallObjects ?? []).some((item) => {
          const concept = getWallConcept(item.conceptId)
          return !!concept && item.wall === wall
            && offsetMm < item.offsetMm + concept.widthMm && item.offsetMm < offsetMm + style.widthMm
            && style.sillMm < item.bottomMm + concept.heightMm && item.bottomMm < style.sillMm + style.heightMm
        })
        if (overlaps) continue
        const error = commitWindow(candidate)
        if (!error) select(candidate.id)
        else report(error)
        return
      }
    }
    report('No clear space for this window was found on any wall.')
  }

  return <div className="wall-panel">
    {group ? <>
      <button className="button back-button" onClick={() => setGroup(null)}><Icon name="back" size={17} />All wall items</button>
      <div className="catalog-items wall-catalog-items" aria-label={categories.find((item) => item.id === group)?.name}>
        {group === 'windows' ? WINDOW_STYLES.map((style) => {
          const drag: WallCatalogDrag = { kind: 'window', id: style.id }
          const full = windowCount >= 2
          return <button key={style.id} className="catalog-tile wall-catalog-tile" type="button" disabled={full} aria-label={full ? 'Maximum of two windows reached' : 'Add ' + style.name + ' to a wall'} title={style.name} draggable={!full} onDragStart={(event) => dragStart(event, drag)} onDragEnd={dragEnd} onClick={() => addWindow(style.id)}><WallThumbnail preview={{ kind: 'window', ...style }} /></button>
        }) : itemConcepts.map((item) => {
          const drag: WallCatalogDrag = { kind: 'wall', id: item.id }
          return <button key={item.id} className="catalog-tile wall-catalog-tile" type="button" disabled={objectCount >= MAX_INSTANCES} aria-label={'Add ' + item.name + ' to a wall'} title={item.name} draggable={objectCount < MAX_INSTANCES} onDragStart={(event) => dragStart(event, drag)} onDragEnd={dragEnd} onClick={() => addWallObject(item.id)}><WallThumbnail preview={{ kind: 'wall', concept: item }} /></button>
        })}
      </div>
    </> : <div className="category-list wall-category-list">{categories.map((item) => <button key={item.id} className="category-button" aria-label={item.name} title={item.name} onClick={() => setGroup(item.id)}><Icon name={item.icon} size={25} /><span>{item.name}</span></button>)}</div>}
  </div>
}
