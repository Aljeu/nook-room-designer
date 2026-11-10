import { useEffect, useId, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { furniturePlacementIssue, getPlanPrimitives, snapElectronicToSurface } from '../geometry'
import { defaultFinishes, getConcept } from '../catalog'
import type { FurnitureInstance } from '../domain/types'
import type { RoomViewportProps } from './RoomViewport'
import { AxisWidget } from '../ui/AxisWidget'
import { FURNITURE_DRAG_TYPE, getActiveFurnitureDrag, snapFurnitureMm } from '../domain/furnitureDrag'

const MIN_PLAN_ZOOM = 0.25
const MAX_PLAN_ZOOM = 3

/** Flat, editable plan built from the same geometry used by plan exports. */
export function PlanViewport(props: RoomViewportProps) {
  const svg = useRef<SVGSVGElement>(null), stage = useRef<SVGGElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0, angle: 0 })
  const [planZoom, setPlanZoom] = useState(props.zoom)
  const panRef = useRef(pan), planZoomRef = useRef(props.zoom)
  const keyboardTargetRef = useRef<{ pan: typeof pan; zoom: number } | null>(null)
  const motionFrameRef = useRef<number | null>(null)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number; issue: string | null; placement?: FurnitureInstance } | null>(null)
  const previewRef = useRef<typeof preview>(null)
  const [catalogPreview, setCatalogPreview] = useState<{ item: FurnitureInstance; issue: string | null } | null>(null)
  const gesture = useRef<{ id: string | null; x: number; y: number; startX: number; startY: number; moved: boolean; panOnly: boolean } | null>(null)
  const touchPoints = useRef(new Map<number, { x: number; y: number }>())
  const pinching = useRef(false)
  const pinchStart = useRef<{ distance: number; zoom: number; pan: typeof pan; midpointX: number; midpointY: number } | null>(null)
  const gridId = useId(), arrowId = useId()
  const night = props.nightMode === true
  const { widthMm: w, depthMm: d } = props.project.room
  const plan = getPlanPrimitives(props.project)
  const pad = 700, width = (w + pad * 2) / planZoom, height = (d + pad * 2) / planZoom
  const stopKeyboardMotion = () => { if (motionFrameRef.current !== null) cancelAnimationFrame(motionFrameRef.current); motionFrameRef.current=null; keyboardTargetRef.current=null }
  const animatePlan = (targetPan: typeof pan, targetZoom: number) => {
    if (motionFrameRef.current !== null) cancelAnimationFrame(motionFrameRef.current)
    const from={...panRef.current},to={...targetPan},fromZoom=planZoomRef.current,toZoom=Math.max(MIN_PLAN_ZOOM,Math.min(MAX_PLAN_ZOOM,targetZoom)),started=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:220
    keyboardTargetRef.current={pan:to,zoom:toZoom}
    const frame=(now:number)=>{
      const t=duration===0?1:Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3)
      const next={x:from.x+(to.x-from.x)*eased,y:from.y+(to.y-from.y)*eased,angle:from.angle+(to.angle-from.angle)*eased}
      const zoom=fromZoom+(toZoom-fromZoom)*eased
      panRef.current=next;planZoomRef.current=zoom;setPan(next);setPlanZoom(zoom)
      if(t<1)motionFrameRef.current=requestAnimationFrame(frame)
      else{motionFrameRef.current=null;keyboardTargetRef.current=null;props.onZoomChange?.(toZoom)}
    }
    motionFrameRef.current=requestAnimationFrame(frame)
  }
  useEffect(() => { stopKeyboardMotion();const home={x:0,y:0,angle:0};panRef.current=home;planZoomRef.current=props.zoom;setPan(home);setPlanZoom(props.zoom) }, [props.resetToken])
  useEffect(() => { if(motionFrameRef.current===null){planZoomRef.current=props.zoom;setPlanZoom(props.zoom)} }, [props.zoom])
  useEffect(() => () => { if(motionFrameRef.current!==null)cancelAnimationFrame(motionFrameRef.current) }, [])
  useEffect(() => { const end=()=>{setCatalogPreview(null);props.onPlacementWarning?.(null)};window.addEventListener('dragend',end);return()=>window.removeEventListener('dragend',end) },[props.onPlacementWarning])
  useEffect(() => {
    const element = svg.current
    if (!element) return
    const preventPageScroll = (event: WheelEvent) => event.preventDefault()
    element.addEventListener('wheel', preventPageScroll, { passive: false })
    return () => element.removeEventListener('wheel', preventPageScroll)
  }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || props.viewLocked || event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).closest('input,textarea,select,dialog,[contenteditable=true]')) return
      if (event.key === 'Escape') { gesture.current=null;previewRef.current=null;setPreview(null);props.onPlacementWarning?.(null);return }
      const k = event.key.toLowerCase()
      if (k !== '+' && k !== '=' && k !== '-' && !['w','a','s','d'].includes(k)) return
      event.preventDefault()
      const base=keyboardTargetRef.current??{pan:panRef.current,zoom:planZoomRef.current}
      const nextPan={...base.pan},nextZoom=k==='+'||k==='='?Math.min(MAX_PLAN_ZOOM,base.zoom+.25):k==='-'?Math.max(MIN_PLAN_ZOOM,base.zoom-.25):base.zoom
      if(k==='a')nextPan.x-=150;else if(k==='d')nextPan.x+=150;else if(k==='w')nextPan.y+=150;else if(k==='s')nextPan.y-=150
      animatePlan(nextPan,nextZoom)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [props.viewLocked])
  function point(event: ReactPointerEvent<SVGSVGElement>) {
    const matrix = stage.current?.getScreenCTM()
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : new DOMPoint()
  }
  function zoomAtPoint(targetZoom: number, clientX: number, clientY: number) {
    const zoom = Math.max(MIN_PLAN_ZOOM, Math.min(MAX_PLAN_ZOOM, targetZoom))
    const currentZoom = planZoomRef.current
    if (Math.abs(zoom - currentZoom) < 0.0001) return
    const rect = svg.current?.getBoundingClientRect()
    let nextPan = panRef.current
    if (rect && rect.width > 0 && rect.height > 0) {
      const scale = Math.max((w + pad * 2) / rect.width, (d + pad * 2) / rect.height)
      const offsetX = (clientX - (rect.left + rect.width / 2)) * scale
      const offsetY = (clientY - (rect.top + rect.height / 2)) * scale
      nextPan = {
        ...panRef.current,
        x: panRef.current.x + offsetX * (1 / currentZoom - 1 / zoom),
        y: panRef.current.y + offsetY * (1 / currentZoom - 1 / zoom),
      }
    }
    panRef.current = nextPan
    planZoomRef.current = zoom
    setPan(nextPan)
    setPlanZoom(zoom)
    props.onZoomChange?.(zoom)
  }
  function beginPinch() {
    const points = [...touchPoints.current.values()]
    if (points.length < 2) return false
    const [a, b] = points
    pinching.current = true
    gesture.current = null
    previewRef.current = null
    setPreview(null)
    props.onPlacementWarning?.(null)
    pinchStart.current = {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      zoom: planZoomRef.current,
      pan: { ...panRef.current },
      midpointX: (a.x + b.x) / 2,
      midpointY: (a.y + b.y) / 2,
    }
    return true
  }
  function updatePinch() {
    const start = pinchStart.current, points = [...touchPoints.current.values()]
    if (!start || points.length < 2) return
    const [a, b] = points, midpointX = (a.x + b.x) / 2, midpointY = (a.y + b.y) / 2
    const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
    const zoom = Math.max(MIN_PLAN_ZOOM, Math.min(MAX_PLAN_ZOOM, start.zoom * distance / start.distance))
    const rect = svg.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return
    const scale = Math.max((w + pad * 2) / rect.width, (d + pad * 2) / rect.height)
    const startOffsetX = (start.midpointX - (rect.left + rect.width / 2)) * scale
    const startOffsetY = (start.midpointY - (rect.top + rect.height / 2)) * scale
    const currentOffsetX = (midpointX - (rect.left + rect.width / 2)) * scale
    const currentOffsetY = (midpointY - (rect.top + rect.height / 2)) * scale
    const nextPan = {
      ...start.pan,
      x: start.pan.x + startOffsetX / start.zoom - currentOffsetX / zoom,
      y: start.pan.y + startOffsetY / start.zoom - currentOffsetY / zoom,
    }
    panRef.current = nextPan
    planZoomRef.current = zoom
    setPan(nextPan)
    setPlanZoom(zoom)
    props.onZoomChange?.(zoom)
  }
  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    svg.current?.focus()
    stopKeyboardMotion()
    previewRef.current = null
    if (event.pointerType === 'touch') {
      if (touchPoints.current.size === 0) pinching.current = false
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      svg.current?.setPointerCapture(event.pointerId)
      if (touchPoints.current.size >= 2) { if (!props.viewLocked) beginPinch(); return }
    }
    const panOnly = props.interactionMode === 'pan'
    const id = panOnly ? null : (event.target as Element).closest('[data-item]')?.getAttribute('data-item') ?? null
    if (id && ((props.project.wallObjects??[]).some(item=>item.id===id)||props.project.room.openings.some(opening=>opening.id===id))) { props.onSelect(id); gesture.current={id,x:0,y:0,startX:0,startY:0,moved:true,panOnly:false}; return }
    if (id && props.commentMode) { props.onCommentTarget?.(id); return }
    if (!id && props.viewLocked) return
    const p = point(event), item = props.project.instances.find(i => i.id === id)
    gesture.current = { id, x: id ? p.x : event.clientX, y: id ? p.y : event.clientY, startX: item?.centerXMm ?? pan.x, startY: item?.centerZMm ?? pan.y, moved: false, panOnly }
    svg.current?.setPointerCapture(event.pointerId)
    if (id) props.onSelect(id)
  }
  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch' && touchPoints.current.has(event.pointerId)) {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (touchPoints.current.size >= 2) { updatePinch(); return }
      if (pinching.current) return
    }
    const g = gesture.current
    if (!g) return
    const p = point(event), dx = p.x-g.x, dy = p.y-g.y
    if (Math.abs(dx)+Math.abs(dy)>10) g.moved=true
    if (g.id) { const item=props.project.instances.find(entry=>entry.id===g.id);if(item){const placement=snapElectronicToSurface(props.project,{...item,centerXMm:snapFurnitureMm(g.startX+dx,event.altKey),centerZMm:snapFurnitureMm(g.startY+dy,event.altKey)},p.x,p.y),x=placement.centerXMm,y=placement.centerZMm,issue=furniturePlacementIssue(props.project,placement),next={id:g.id,x,y,issue,placement};previewRef.current=next;setPreview(next);props.onPlacementWarning?.(issue)} }
    else { const rect=svg.current!.getBoundingClientRect(); const scale=Math.max(width/rect.width,height/rect.height);setPan(v=>{const next={...v,x:g.startX-(event.clientX-g.x)*scale,y:g.startY-(event.clientY-g.y)*scale};panRef.current=next;return next}) }
  }
  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') touchPoints.current.delete(event.pointerId)
    if (pinching.current) {
      if (touchPoints.current.size < 2) pinchStart.current = null
      if (touchPoints.current.size === 0) pinching.current = false
      gesture.current = null
      setPreview(null)
      return
    }
    const g = gesture.current, finalPreview=previewRef.current; gesture.current=null;previewRef.current=null
    if (g?.panOnly) { setPreview(null); return }
    if (g?.id && ((props.project.wallObjects??[]).some(item=>item.id===g.id)||props.project.room.openings.some(opening=>opening.id===g.id))) { setPreview(null); return }
    if (g?.id && g.moved && finalPreview) { if(finalPreview.issue)props.onStatus(finalPreview.issue,'warning');else props.onMoveCommit(g.id,finalPreview.x,finalPreview.y,finalPreview.placement) }
    else if(g?.id) inspectItem(g.id)
    else props.onSelect(null)
    setPreview(null);props.onPlacementWarning?.(null)
  }
  function handlePointerCancel(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') touchPoints.current.delete(event.pointerId)
    if (pinching.current) {
      if (touchPoints.current.size < 2) pinchStart.current = null
      if (touchPoints.current.size === 0) pinching.current = false
    }
    gesture.current=null;previewRef.current=null
    setPreview(null);props.onPlacementWarning?.(null)
  }
  function inspectItem(id: string) {
    const item=props.project.instances.find(entry=>entry.id===id),matrix=stage.current?.getScreenCTM()
    if(!item){props.onInspect?.(id);return}
    const screen=matrix?new DOMPoint(item.centerXMm,item.centerZMm).matrixTransform(matrix):undefined
    props.onInspect?.(id,screen?{x:screen.x,y:screen.y}:undefined)
  }
  function catalogItemAt(event: ReactDragEvent<SVGSVGElement>, id: string) {
    const concept=getConcept(2,id),matrix=stage.current?.getScreenCTM()
    if(!concept?.available||!matrix)return null
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse())
    const item=snapElectronicToSurface(props.project,{id:'catalog-preview',conceptId:id,centerXMm:snapFurnitureMm(p.x,event.altKey),centerZMm:snapFurnitureMm(p.y,event.altKey),quarterTurn:0,finishes:defaultFinishes(concept)},p.x,p.y)
    return {item,issue:furniturePlacementIssue(props.project,item)}
  }
  return <div className="plan-viewport-shell"><svg ref={svg} className={'plan-viewport' + (props.interactionMode === 'pan' ? ' is-pan-mode' : '') + (night ? ' is-night' : '')} role="application" aria-label="2D floor plan. Drag furniture to move it in Select mode. Use Pan to move the view. Use WASD to pan and plus or minus to zoom." tabIndex={0} viewBox={`${w/2-width/2+pan.x} ${d/2-height/2+pan.y} ${width} ${height}`} onWheel={event => { event.preventDefault(); if (!props.viewLocked) zoomAtPoint(planZoomRef.current*Math.exp(-event.deltaY*.001),event.clientX,event.clientY) }}
    onDragOver={event=>{if(!event.dataTransfer.types.includes(FURNITURE_DRAG_TYPE))return;event.preventDefault();event.dataTransfer.dropEffect='copy';const id=getActiveFurnitureDrag(),next=id?catalogItemAt(event,id):null;setCatalogPreview(next);props.onPlacementWarning?.(next?.issue??null)}} onDragLeave={event=>{if(event.relatedTarget instanceof Node&&event.currentTarget.contains(event.relatedTarget))return;setCatalogPreview(null);props.onPlacementWarning?.(null)}} onDrop={event=>{const id=event.dataTransfer.getData(FURNITURE_DRAG_TYPE);if(!id)return;event.preventDefault();const next=catalogItemAt(event,id);setCatalogPreview(null);props.onPlacementWarning?.(null);if(!next){props.onStatus('Could not place the furniture. Please try again.','warning');return}if(next.issue){props.onStatus(next.issue,'warning');return}props.onAddAt?.(id,next.item.centerXMm,next.item.centerZMm,next.item)}}
    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel}>
    <defs><pattern id={gridId} width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 H 0 V 100" fill="none" stroke={night?'#263750':'#dce3e7'} strokeWidth="5" /></pattern><marker id={arrowId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill={night?'#d2def0':'#56665b'} /></marker></defs>
    <rect x={w/2-width/2+pan.x} y={d/2-height/2+pan.y} width={width} height={height} fill={`url(#${gridId})`} />
    <g ref={stage} transform={`rotate(${pan.angle} ${w/2} ${d/2})`}>
      <path d={plan.roomPathD} fill={night?'#25344b':'#eee6d7'} />
      {plan.walls.map((b,i)=><rect key={i} x={b.xMm} y={b.zMm} width={b.widthMm} height={b.depthMm} fill={night?'#71829b':'#5f6b6d'} />)}
      {plan.curvedWallPathD&&<path d={plan.curvedWallPathD} fill="none" stroke={night?'#71829b':'#5f6b6d'} strokeWidth="100" strokeLinecap="round" strokeLinejoin="round" />}
      {[...plan.items].sort((a,b)=>Number(b.isRug)-Number(a.isRug)).map(item => {const instance=props.project.instances.find(i=>i.id===item.id)!,degrees=props.rotationPreview?.id===item.id?props.rotationPreview.degrees:preview?.id===item.id&&preview.placement?(preview.placement.rotationDegrees??preview.placement.quarterTurn*90):(instance.rotationDegrees??instance.quarterTurn*90);return <g key={item.id} data-item={item.id} role="button" aria-label={getConcept(2, item.conceptId)?.name ?? 'Furniture'} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectItem(item.id)}}} transform={preview?.id === item.id ? `translate(${preview.x} ${preview.y}) rotate(${degrees}) scale(${instance.flipHorizontal?-1:1} ${instance.flipVertical?-1:1})` : item.svgTransform} style={{cursor:'move'}}><path d={item.pathD} fill={item.isRug?(night?'#526078':'#dedbd1'):(night?'#d4dced':'#fafaf7')} stroke={preview?.id===item.id&&preview.issue?'#bf4032':props.selectedId===item.id?(night?'#83e0a8':'#296b56'):(night?'#d9e2ef':'#49564e')} strokeWidth={props.selectedId===item.id?30:15} /></g>})}
      {catalogPreview && getPlanPrimitives({...props.project,instances:[catalogPreview.item]}).items.map(item=><g key="catalog-preview" transform={item.svgTransform} opacity=".8" pointerEvents="none"><path d={item.pathD} fill={night?'#d4dced':'#fafaf7'} stroke={catalogPreview.issue?'#bf4032':night?'#83e0a8':'#296b56'} strokeWidth="30" /></g>)}
      {plan.openings.map(o=><g key={o.id} data-item={o.id} role="button" tabIndex={0} aria-label={o.type==='window'?'Window':o.type==='archway'?'Archway':'Door'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();props.onSelect(o.id)}}} style={{cursor:'pointer'}}><path d={o.pathD} fill="none" stroke={props.selectedId===o.id?(night?'#83e0a8':'#296b56'):(night?'#d9e2ef':'#49564e')} strokeWidth={props.selectedId===o.id?30:18} /><path d={o.pathD} fill="none" stroke="transparent" strokeWidth={120} pointerEvents="stroke" /></g>)}
      {plan.wallObjects.map(item=><path key={item.id} data-item={item.id} role="button" tabIndex={0} aria-label={item.conceptId} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();props.onSelect(item.id)}}} d={item.pathD} fill={night?'#b8c7da':'#b79a76'} fillOpacity=".45" stroke={props.selectedId===item.id?(night?'#83e0a8':'#296b56'):(night?'#d9e2ef':'#6d5c49')} strokeWidth={props.selectedId===item.id?30:15} strokeDasharray="45 20" style={{cursor:'pointer'}} />)}
      <g fill={night?'#e4eaf4':'#24302b'} stroke={night?'#bac8dc':'#56665b'} strokeWidth="10" fontSize="100" textAnchor="middle">
        <path d={`M 0 -300 H ${w}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        <path d={`M -300 0 V ${d}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        <text x={w/2} y={-370} stroke="none">{w/1000} m</text>
        <text transform={`translate(-370 ${d/2}) rotate(-90)`} stroke="none">{d/1000} m</text>
      </g>
      <text x={w/2} y={d+340} fill={night?'#c8d4e6':'#56665b'} fontSize="95" textAnchor="middle">{props.project.name} · {(w*d/1e6).toFixed(2)} m²</text>
    </g>
  </svg><AxisWidget mode="2d" /></div>
}
