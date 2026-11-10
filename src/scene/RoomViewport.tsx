import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { FurnitureInstance, Opening, Project, Wall, WindowOpening } from '../domain/types'
import { furniturePlacementIssue, openingBasis, snapElectronicToSurface, validateProjectSpatial } from '../geometry'
import { validateWallAttachment, type WallAttachmentGeometry } from '../geometry/wallAttachment'
import { buildFurniture, disposeFurniture, prepareFurniture, furnitureResourceLedger } from '../assets/models'
import { applyWallAttachmentPose, applyWallObject, applyWindowObject, buildWallPreview, buildWindowPreview, disposeWallModel, disposeWindowModel, prepareWallModels,wallResourceLedger } from '../assets/wallModels'
import { defaultFinishes, getConcept } from '../catalog'
import { getWallConcept, getWindowStyle } from '../catalog/wall'
import { getDoorStyle } from '../catalog/doors'
import { MAX_DOORWAYS, MAX_OPENINGS, MAX_WINDOWS } from '../domain/constants'
import { applyDoorObject, buildDoorPreview, disposeDoorModel, prepareDoorModels } from '../assets/doorModels'
import { createRenderer, createWorld, previewMaterial, type World } from './world'
import { createLatestRequestGate, sameEditingScope } from './latest'
import { canonicalPose, clampZoom, DEFAULT_VIEW_ZOOM, gestureOwner, orbitPose, stepPose, type CameraCommand, type CameraPose } from './camera'
import type { FeedbackKind } from '../editor/store'
import { AxisWidget } from '../ui/AxisWidget'
import { FURNITURE_DRAG_TYPE, getActiveFurnitureDrag, snapFurnitureMm } from '../domain/furnitureDrag'
import { decodeWallDrag, getActiveWallDrag, WALL_DRAG_TYPE, type WallCatalogDrag } from '../domain/wallDrag'
export type RoomViewportProps = { project: Project; sessionToken?:number; selectedId:string|null; view:'isometric'|'top'; zoom:number; wallsUp?:boolean; animationsEnabled?:boolean; nightMode?:boolean; interactionMode?:'select'|'pan'; onSelect:(id:string|null)=>void; onMoveCommit:(id:string,xMm:number,zMm:number,placement?:FurnitureInstance)=>void; onAddAt?:(id:string,xMm:number,zMm:number,placement?:FurnitureInstance)=>void; onWallMoveCommit?:(id:string,wall:Wall,offsetMm:number,bottomMm:number)=>void; onWallAddAt?:(item:WallCatalogDrag,wall:Wall,offsetMm:number,bottomMm:number)=>void; onPlacementWarning?:(message:string|null)=>void; onStatus:(message:string,kind?:FeedbackKind)=>void; onInspect?:(id:string,screenPoint?:{x:number;y:number})=>void; commentMode?:boolean; onCommentTarget?:(id:string)=>void; cameraCommand?:CameraCommand; diagnostics?:boolean; benchmarkToken?:number; onMetrics?:(metrics:Record<string,number|string|boolean>)=>void; viewLocked?:boolean; resetToken?:number; onZoomChange?:(zoom:number)=>void; onAxisSelect?:(axis:'x'|'y'|'z',sign:1|-1)=>void; rotationPreview?:{id:string;degrees:number}|null }
type Drag = { id:string; offsetX:number;offsetZ:number; x:number;z:number; moved:boolean; valid:boolean; reason:string|null; pointerId:number; placement?:FurnitureInstance }
type WallDrag = { id:string; kind:'wall'|'window'|'door'; wall:Wall; initialWall:Wall; offsetMm:number; bottomMm:number; x:number; y:number; widthMm:number; heightMm:number; depthMm:number; grabU:number; grabY:number; moved:boolean; valid:boolean; reason:string|null; pointerId:number }
function wallObjectIssue(project:Project, item:WallAttachmentGeometry & {id?:string}) {
 const issue=validateWallAttachment(project.room,item)[0]
 if(issue)return issue.message
 for(const other of project.wallObjects??[]){
  if(other.id===item.id||other.wall!==item.wall)continue
  const concept=getWallConcept(other.conceptId);if(!concept)continue
  const horizontal=item.offsetMm<other.offsetMm+concept.widthMm&&other.offsetMm<item.offsetMm+item.widthMm
  const vertical=item.bottomMm<other.bottomMm+concept.heightMm&&other.bottomMm<item.bottomMm+item.heightMm
  if(horizontal&&vertical)return 'Wall objects overlap. Choose a clear section of wall.'
 }
 return null
}
function windowIssue(project:Project, opening:WindowOpening, ignoreId?:string) {
 if(!ignoreId&&project.room.openings.filter((entry)=>entry.type==='window').length>=MAX_WINDOWS)return `This room already has ${MAX_WINDOWS} windows.`
 if(!ignoreId&&project.room.openings.length>=MAX_OPENINGS)return 'This room already has the maximum number of wall openings.'
 const next:Project={...project,room:{...project.room,openings:[...project.room.openings.filter((entry)=>entry.id!==ignoreId),opening]}}
 const spatial=validateProjectSpatial(next).find((entry)=>entry.severity==='hard')
 if(spatial)return spatial.message
 for(const item of project.wallObjects??[]){
  if(item.wall!==opening.wall)continue
  const concept=getWallConcept(item.conceptId);if(!concept)continue
  const overlapX=opening.offsetMm<item.offsetMm+concept.widthMm&&item.offsetMm<opening.offsetMm+opening.widthMm
  const overlapY=opening.sillMm<item.bottomMm+concept.heightMm&&item.bottomMm<opening.sillMm+opening.heightMm
  if(overlapX&&overlapY)return 'The window overlaps a wall object. Choose another position.'
 }
 return null
}
function doorwayIssue(project:Project, opening:Exclude<Opening,{type:'window'}>, ignoreId?:string) {
 if(!ignoreId&&project.room.openings.filter((entry)=>entry.type!=='window').length>=MAX_DOORWAYS)return `This room already has ${MAX_DOORWAYS} doors or archways.`
 if(!ignoreId&&project.room.openings.length>=MAX_OPENINGS)return 'This room already has the maximum number of wall openings.'
 const next:Project={...project,room:{...project.room,openings:[...project.room.openings.filter((entry)=>entry.id!==ignoreId),opening]}}
 const spatial=validateProjectSpatial(next).find((entry)=>entry.severity==='hard')
 if(spatial)return spatial.message
 for(const item of project.wallObjects??[]){if(item.wall!==opening.wall)continue;const concept=getWallConcept(item.conceptId);if(!concept)continue;const across=opening.offsetMm<item.offsetMm+concept.widthMm&&item.offsetMm<opening.offsetMm+opening.widthMm,vertical=opening.sillMm<item.bottomMm+concept.heightMm&&item.bottomMm<opening.sillMm+opening.heightMm;if(across&&vertical)return 'The doorway overlaps a wall object. Choose another position.'}
 return null
}
function doorOpening(styleId:string,wall:Wall,offsetMm:number,id='door-preview'):Exclude<Opening,{type:'window'}>|undefined {
 const style=getDoorStyle(styleId);if(!style)return
 return style.category==='archways'?{id,type:'archway',styleId,wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:0}:{id,type:'door',styleId,hinge:'min',wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:0}
}
export function RoomViewport(props:RoomViewportProps) {
 const host=useRef<HTMLDivElement>(null), latest=useRef(props),worldRef=useRef<World|null>(null),rendererRef=useRef<THREE.WebGLRenderer|null>(null),drawRef=useRef<(forceMetrics?:boolean)=>void>(()=>{}),dragRef=useRef<Drag|null>(null),wallDragRef=useRef<WallDrag|null>(null),firstRef=useRef(false),benchmarkRef=useRef<number|null>(null),tokenRef=useRef<number|undefined>(undefined)
 const poseRef=useRef(canonicalPose()),zoomRef=useRef(clampZoom(props.zoom)),keyboardTargetRef=useRef<{pose:ReturnType<typeof canonicalPose>;zoom:number}|null>(null),keyboardFrameRef=useRef<number|null>(null), orbitRef=useRef<{pointerId:number;x:number;y:number;moved:boolean;button:number}|null>(null),panDragRef=useRef<{pointerId:number;x:number;y:number}|null>(null), touchesRef=useRef(new Map<number,{x:number;y:number}>()),pinchRef=useRef<number|null>(null),resetRef=useRef(props.resetToken), commandRef=useRef(0)
 const [renderError,setRenderError]=useState<string|null>(null)
 const [loadError,setLoadError]=useState<string|null>(null)
 const [axisPose,setAxisPose]=useState<CameraPose>(()=>canonicalPose())
 const updateAxisPose=(pose:CameraPose)=>setAxisPose(current=>current.azimuth===pose.azimuth&&current.elevation===pose.elevation?current:{azimuth:pose.azimuth,elevation:pose.elevation})
 const rotationPreviewRef=useRef<{id:string;degrees:number}|null>(null)
 const failedRef=useRef(false), feedbackStarted=useRef<number|null>(null),previousVisual=useRef({project:props.project,selectedId:props.selectedId})
 if(previousVisual.current.project!==props.project||previousVisual.current.selectedId!==props.selectedId){feedbackStarted.current=performance.now();previousVisual.current={project:props.project,selectedId:props.selectedId}}
 latest.current=props
 const stopKeyboardMotion=()=>{if(keyboardFrameRef.current!==null)cancelAnimationFrame(keyboardFrameRef.current);keyboardFrameRef.current=null;keyboardTargetRef.current=null}
 useEffect(()=>{const root=host.current;if(!root)return;
 const fail=(error:unknown)=>{if(failedRef.current)return;failedRef.current=true;const detail=error instanceof Error?error.message:'Unknown rendering error';const message=`Room view could not be displayed: ${detail}. Check WebGL support and reload.`;setRenderError(message);latest.current.onStatus(message,'error')}
 let catalogGhost:{id:string;scene:THREE.Scene;object:THREE.Group;outline:THREE.BoxHelper}|null=null
 let wallCatalogGhost:{key:string;scene:THREE.Scene;object:THREE.Group;outline:THREE.BoxHelper;kind:'wall'|'window'|'door'}|null=null
 let renderer:THREE.WebGLRenderer
 try { renderer=createRenderer() } catch(error) { fail(error);return }
 rendererRef.current=renderer;root.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive room. Use Select to choose furniture or Pan to move the view. Use WASD to pan, Q and E to rotate, plus and minus to zoom.');renderer.domElement.style.cssText=`width:100%;height:100%;display:block;touch-action:none;cursor:${latest.current.interactionMode==='pan'?'grab':'default'};`;let raf=0;let benchmarkStart=0,last=0,lastMetrics=0;let intervals:number[]=[];const syncGate=createLatestRequestGate();let ghostGeneration=0,dropGeneration=0,disposed=false,worldKey='';let zoomMetricTimer:ReturnType<typeof setTimeout>|undefined
 const draw=(forceMetrics=false)=>{
  const w=worldRef.current;if(!w||failedRef.current)return
  try {
   renderer.info.reset();renderer.render(w.scene,w.camera)
   const now=performance.now(),p=latest.current,feedback=feedbackStarted.current
   feedbackStarted.current=null
   if(p.diagnostics&&(forceMetrics||feedback!==null||!firstRef.current||now-lastMetrics>=1000)){
    const activeMaterials=new Set<THREE.Material>()
    w.scene.traverseVisible(object=>{if(object instanceof THREE.Mesh || object instanceof THREE.Line){const ms=Array.isArray(object.material)?object.material:[object.material];ms.forEach(m=>activeMaterials.add(m))}})
    const ledger=furnitureResourceLedger();const metrics:Record<string,number|string|boolean>={...ledger,...wallResourceLedger(),allocatedKnownMaterials:ledger.allocatedFurnitureMaterials+5+1,rendererShadowMaterials:'not included; renderer-managed (depth, distance, two VSM materials per renderer; clones conditional)',rendererPrograms:renderer.info.programs?.length??0,renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,sceneMaterialVariants:activeMaterials.size,cameraAzimuthDeg:((poseRef.current.azimuth*180/Math.PI)%360+360)%360,cameraElevationDeg:poseRef.current.elevation*180/Math.PI,cameraZoom:zoomRef.current,locked:!!p.viewLocked}
    if(!firstRef.current){metrics.firstUsableFrameMs=now;firstRef.current=true}
    if(feedback!==null)metrics.visualFeedbackMs=now-feedback
    lastMetrics=now;p.onMetrics?.(metrics)
   }
  } catch(error) { fail(error) }
 }
 drawRef.current=draw
 const renderBenchmark=(now:number)=>{if(!benchmarkStart){benchmarkStart=now;last=now} else {intervals.push(now-last);last=now}draw();if(now-benchmarkStart<30000){raf=requestAnimationFrame(renderBenchmark)}else{const sorted=[...intervals].sort((a,b)=>a-b);latest.current.onMetrics?.({benchmarkP95FrameMs:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??0,benchmarkSamples:sorted.length,benchmarkDurationMs:now-benchmarkStart,benchmarkComplete:true});benchmarkRef.current=null;raf=0}}
 const startBenchmark=()=>{cancelAnimationFrame(raf);benchmarkStart=0;last=0;intervals=[];benchmarkRef.current=performance.now();raf=requestAnimationFrame(renderBenchmark)}
 const resize=()=>{
  if(failedRef.current)return
  const generation=syncGate.begin(),p=latest.current,project=p.project,view=p.view,selected=p.selectedId
  const rect=root.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height)
  if(renderer.domElement.width!==Math.floor(width)||renderer.domElement.height!==Math.floor(height)){renderer.setSize(width,height,false);if(worldRef.current){const pendingFeedback=feedbackStarted.current;feedbackStarted.current=null;draw();feedbackStarted.current=pendingFeedback}}
  void Promise.all([prepareFurniture(project.instances.map(item=>item.conceptId)),...(project.wallObjects?.length||project.room.openings.some(o=>o.type==='window')?[prepareWallModels()]:[]),...(project.room.openings.some(o=>o.type!=='window')?[prepareDoorModels()]:[])]).then(()=>{
   if(disposed||!syncGate.isCurrent(generation))return
   try {
    const key=JSON.stringify([project.room,project.wallObjects??[],view,!!p.nightMode])
    if(!worldRef.current||key!==worldKey){const next=createWorld(project,view,zoomRef.current,width,height,selected,poseRef.current,true,!!p.wallsUp,p.animationsEnabled!==false,!!p.nightMode),previous=worldRef.current;if(catalogGhost)clearCatalogGhost();worldRef.current=next;worldKey=key;previous?.dispose()}
    else{worldRef.current.updateProject(project,selected,dragRef.current?.id);worldRef.current.setCamera(poseRef.current,zoomRef.current,width,height);worldRef.current.setAnimationsEnabled(p.animationsEnabled!==false)}
    const activeDrag=dragRef.current;if(activeDrag)worldRef.current?.setHighlight(activeDrag.id,!activeDrag.valid)
    const preview=rotationPreviewRef.current;if(preview){const object=worldRef.current?.objects.get(preview.id);if(object){object.rotation.y=-preview.degrees*Math.PI/180;object.updateMatrixWorld(true);worldRef.current?.setHighlight(selected)}}
    setLoadError(null);draw()
   }catch(error){console.error('Furniture model could not be loaded:',error);const message='Some furniture could not load. Your design is still here.';setLoadError(message);latest.current.onStatus(message,'error')}
  },error=>{if(disposed||!syncGate.isCurrent(generation))return;console.error('Furniture family could not be loaded:',error);const message='Some furniture could not load. Your design is still here.';setLoadError(message);latest.current.onStatus(message,'error')})
 }
 const observer=new ResizeObserver(resize);observer.observe(root);resize()
 const ray=new THREE.Raycaster(),point=new THREE.Vector2(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3()
 function rayAt(e:{clientX:number;clientY:number}){const rect=renderer.domElement.getBoundingClientRect();point.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const world=worldRef.current;if(!world)return false;ray.setFromCamera(point,world.camera);return !!ray.ray.intersectPlane(floor,hit)}
 function snapAtRay(item:FurnitureInstance){
  if(item.conceptId!=='ELC-ELC-01'&&item.conceptId!=='ELC-ELC-02')return item
  const project=latest.current.project, candidates:{item:FurnitureInstance;distance:number}[]=[]
  for(const surface of project.instances){const concept=getConcept(2,surface.conceptId);if(!concept)continue;const height=(surface.elevationMm??0)+concept.dimensions.heightMm,intersection=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height/1000),intersection))continue;const resolved=snapElectronicToSurface(project,item,intersection.x*1000,intersection.z*1000);if(resolved!==item&&resolved.elevationMm===height)candidates.push({item:resolved,distance:ray.ray.origin.distanceTo(intersection)})}
  candidates.sort((a,b)=>a.distance-b.distance);return candidates[0]?.item??item
 }
 function wallHitAt(e:{clientX:number;clientY:number}){
  const rect=renderer.domElement.getBoundingClientRect(),world=worldRef.current
  if(!world||latest.current.view!=='isometric')return null
  point.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(point,world.camera)
  const visibleGroups=[...world.wallGroups.values()].filter((group)=>group.visible),intersections=ray.intersectObjects(visibleGroups,true)
  for(const intersection of intersections){let parent:THREE.Object3D|null=intersection.object;while(parent&&parent.userData.wall===undefined)parent=parent.parent;if(parent){const wall=parent.userData.wall as Wall,local=wallLocalPosition(wall,intersection.point),length=openingBasis(latest.current.project.room,wall).length;if(local.u>=-50&&local.u<=length+50&&local.y>=-50&&local.y<=latest.current.project.room.heightMm+50)return{wall,point:intersection.point.clone()}}}
  // Openings have no wall mesh to raycast. Intersect visible wall planes so a
  // window dragged over an opening still gets a red, invalid placement preview.
  let nearest:{wall:Wall;point:THREE.Vector3;distance:number}|null=null
  for(const [wall,group] of world.wallGroups){
   if(!group.visible)continue
   const planePoint=wallPlaneAt(wall,e)
   if(!planePoint)continue
   const local=wallLocalPosition(wall,planePoint),length=openingBasis(latest.current.project.room,wall).length
   if(local.u<0||local.u>length||local.y<0||local.y>latest.current.project.room.heightMm)continue
   const distance=planePoint.distanceTo(ray.ray.origin)
   if(!nearest||distance<nearest.distance)nearest={wall,point:planePoint,distance}
  }
  return nearest?{wall:nearest.wall,point:nearest.point}:null
 }
 function wallPlaneAt(wall:Wall,e:{clientX:number;clientY:number}){const rect=renderer.domElement.getBoundingClientRect(),world=worldRef.current;if(!world)return null;point.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(point,world.camera);const basis=openingBasis(latest.current.project.room,wall),origin=new THREE.Vector3(basis.x/1000,0,basis.z/1000),normal=new THREE.Vector3(basis.ix,0,basis.iz),plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,origin);return ray.ray.intersectPlane(plane,new THREE.Vector3())}
 function wallLocalPosition(wall:Wall,point:THREE.Vector3){const basis=openingBasis(latest.current.project.room,wall),x=point.x*1000-basis.x,z=point.z*1000-basis.z;return{u:x*basis.tx+z*basis.tz,y:point.y*1000}}
 const refit=()=>{const rect=root.getBoundingClientRect();worldRef.current?.setCamera(poseRef.current,zoomRef.current,Math.max(1,rect.width),Math.max(1,rect.height));draw()}
 const objectScreenPoint=(id:string)=>{const object=worldRef.current?.objects.get(id),canvas=renderer.domElement;if(!object)return undefined;worldRef.current?.scene.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(worldRef.current!.camera),rect=canvas.getBoundingClientRect();return{x:rect.left+(center.x+1)*rect.width/2,y:rect.top+(1-center.y)*rect.height/2}}
 const animateKeyboardCamera=(targetPose:ReturnType<typeof canonicalPose>,targetZoom:number)=>{
  stopKeyboardMotion()
  const from={...poseRef.current},to={...targetPose},fromZoom=zoomRef.current,toZoom=clampZoom(targetZoom),started=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:220
  keyboardTargetRef.current={pose:to,zoom:toZoom}
  const frame=(now:number)=>{
   const t=duration===0?1:Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3)
   poseRef.current={azimuth:from.azimuth+(to.azimuth-from.azimuth)*eased,elevation:from.elevation+(to.elevation-from.elevation)*eased,panX:(from.panX??0)+((to.panX??0)-(from.panX??0))*eased,panY:(from.panY??0)+((to.panY??0)-(from.panY??0))*eased}
   updateAxisPose(poseRef.current)
   zoomRef.current=fromZoom+(toZoom-fromZoom)*eased
   refit()
   if(t<1)keyboardFrameRef.current=requestAnimationFrame(frame)
   else{keyboardFrameRef.current=null;keyboardTargetRef.current=null;latest.current.onZoomChange?.(toZoom)}
  }
  keyboardFrameRef.current=requestAnimationFrame(frame)
 }
 const zoomBy=(factor:number)=>{if(latest.current.viewLocked)return;const next=clampZoom(zoomRef.current*factor);if(next===zoomRef.current)return;zoomRef.current=next;latest.current.onZoomChange?.(next);refit()}
 const cancel=()=>{const wallDrag=wallDragRef.current;if(wallDrag){wallDragRef.current=null;const project=latest.current.project,object=worldRef.current?.objects.get(wallDrag.id),item=project.wallObjects?.find((entry)=>entry.id===wallDrag.id),opening=project.room.openings.find((entry)=>entry.id===wallDrag.id);if(object){if(item)applyWallObject(object,project.room,item);else if(opening?.type==='window')applyWindowObject(object,project.room,opening);else if(opening)applyDoorObject(object,project.room,opening)}worldRef.current?.setHighlight(wallDrag.id);latest.current.onPlacementWarning?.(null);draw();return}const drag=dragRef.current;if(!drag)return;dragRef.current=null;latest.current.onPlacementWarning?.(null);const obj=worldRef.current?.objects.get(drag.id),original=latest.current.project.instances.find(i=>i.id===drag.id);if(obj&&original){obj.position.set(original.centerXMm/1000,(original.elevationMm??0)/1000,original.centerZMm/1000);obj.rotation.y=-(original.rotationDegrees??original.quarterTurn*90)*Math.PI/180}worldRef.current?.setHighlight(drag.id);latest.current.onStatus('Move cancelled.');draw()}
 const down=(e:PointerEvent)=>{
  stopKeyboardMotion();renderer.domElement.focus({preventScroll:true});const world=worldRef.current;if(!world)return
  if(e.pointerType!=='touch'&&e.button===0&&latest.current.interactionMode==='pan'){
   if(latest.current.viewLocked)return
   latest.current.onSelect(null)
   panDragRef.current={pointerId:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.style.cursor='grabbing';renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();return
  }
  const floorHit=rayAt(e)
  const hits=ray.intersectObjects([...world.objects.values()],true);let obj:THREE.Object3D|null=hits[0]?.object??null;while(obj&&!obj.userData.instanceId)obj=obj.parent;const id=obj?.userData.instanceId as string|undefined
  if(e.button===0&&latest.current.commentMode&&id){latest.current.onCommentTarget?.(id);e.preventDefault();return}
  const owner=gestureOwner(e.button,e.pointerType,!!id,!!latest.current.viewLocked,latest.current.view)
  if(e.pointerType==='touch'){e.preventDefault();if(latest.current.viewLocked)return;cancel();orbitRef.current=null;touchesRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchesRef.current.size===2){const [a,b]=[...touchesRef.current.values()];pinchRef.current=Math.hypot(a.x-b.x,a.y-b.y)}renderer.domElement.setPointerCapture(e.pointerId);return}
  if(owner==='orbit'){latest.current.onSelect(null);orbitRef.current={pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,button:e.button};renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();return}
  if(owner!=='furniture'){if(e.button===0&&!id)latest.current.onSelect(null);return}
  const wallObject=latest.current.project.wallObjects?.find((item)=>item.id===id),opening=latest.current.project.room.openings.find((item)=>item.id===id)
  if(wallObject||opening){
   const target=wallObject??opening!,concept=wallObject?getWallConcept(wallObject.conceptId):undefined,planePoint=wallPlaneAt(target.wall,e)
   if(!planePoint)return
   const width=wallObject?concept?.widthMm??0:opening!.widthMm,height=wallObject?concept?.heightMm??0:opening!.heightMm,depth=wallObject?concept?.depthMm??60:opening!.type==='window'?60:130
   if(!width||!height)return
   const local=wallLocalPosition(target.wall,planePoint),offset=target.offsetMm,bottom=wallObject?wallObject.bottomMm:opening!.sillMm
   latest.current.onSelect(target.id)
    wallDragRef.current={id:target.id,kind:wallObject?'wall':opening!.type==='window'?'window':'door',wall:target.wall,initialWall:target.wall,offsetMm:offset,bottomMm:bottom,x:offset,y:bottom,widthMm:width,heightMm:height,depthMm:depth,grabU:local.u-(offset+width/2),grabY:local.y-bottom,moved:false,valid:true,reason:null,pointerId:e.pointerId}
   renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();return
  }
  const item=latest.current.project.instances.find(i=>i.id===id);if(!item){if(id)latest.current.onSelect(id);return}if(!floorHit)return;latest.current.onSelect(item.id);dragRef.current={id:item.id,offsetX:item.centerXMm-hit.x*1000,offsetZ:item.centerZMm-hit.z*1000,x:item.centerXMm,z:item.centerZMm,moved:false,valid:true,reason:null,pointerId:e.pointerId};renderer.domElement.setPointerCapture(e.pointerId)
 }
 const move=(e:PointerEvent)=>{
  if(e.pointerType==='touch'&&touchesRef.current.has(e.pointerId)){e.preventDefault();touchesRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!latest.current.viewLocked&&touchesRef.current.size===2){const [a,b]=[...touchesRef.current.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchRef.current&&distance>0)zoomBy(distance/pinchRef.current);pinchRef.current=distance}return}
  const pan=panDragRef.current,panWorld=worldRef.current
  if(pan?.pointerId===e.pointerId&&panWorld){const rect=renderer.domElement.getBoundingClientRect(),dx=e.clientX-pan.x,dy=e.clientY-pan.y;pan.x=e.clientX;pan.y=e.clientY;poseRef.current={...poseRef.current,panX:(poseRef.current.panX??0)-dx*(panWorld.camera.right-panWorld.camera.left)/Math.max(1,rect.width),panY:(poseRef.current.panY??0)+dy*(panWorld.camera.top-panWorld.camera.bottom)/Math.max(1,rect.height)};refit();return}
  const orbit=orbitRef.current;if(orbit?.pointerId===e.pointerId){if(latest.current.viewLocked||latest.current.view!=='isometric'){orbitRef.current=null;return}const dx=e.clientX-orbit.x,dy=e.clientY-orbit.y;orbit.x=e.clientX;orbit.y=e.clientY;if(dx||dy){orbit.moved=true;poseRef.current=orbitPose(poseRef.current,dx,dy);updateAxisPose(poseRef.current);refit()}return}
  const wallDrag=wallDragRef.current,wallWorld=worldRef.current
  if(wallDrag&&wallWorld&&wallDrag.pointerId===e.pointerId){const hitWall=wallHitAt(e),nextWall=hitWall?.wall??wallDrag.wall,pointOnWall=hitWall?.wall===nextWall?hitWall.point:wallPlaneAt(nextWall,e);if(!pointOnWall)return;const local=wallLocalPosition(nextWall,pointOnWall),offset=snapFurnitureMm(local.u-wallDrag.grabU-wallDrag.widthMm/2,e.altKey),bottom=wallDrag.kind==='door'?0:snapFurnitureMm(local.y-wallDrag.grabY,e.altKey),project=latest.current.project;let issue:string|null=null
   if(wallDrag.kind==='wall')issue=wallObjectIssue(project,{id:wallDrag.id,wall:nextWall,offsetMm:offset,bottomMm:bottom,widthMm:wallDrag.widthMm,heightMm:wallDrag.heightMm,depthMm:wallDrag.depthMm})
   else {const original=project.room.openings.find((entry)=>entry.id===wallDrag.id);if(original?.type==='window')issue=windowIssue(project,{...original,wall:nextWall,offsetMm:offset,sillMm:bottom},wallDrag.id);else if(original)issue=doorwayIssue(project,{...original,wall:nextWall,offsetMm:offset,sillMm:0},wallDrag.id)}
   wallDrag.wall=nextWall;wallDrag.offsetMm=offset;wallDrag.bottomMm=bottom;wallDrag.moved=nextWall!==wallDrag.initialWall||offset!==wallDrag.x||bottom!==wallDrag.y;wallDrag.valid=!issue;wallDrag.reason=issue
   const object=wallWorld.objects.get(wallDrag.id);if(object){if(wallDrag.kind==='wall')applyWallAttachmentPose(object,project.room,{wall:nextWall,offsetMm:offset,bottomMm:bottom,widthMm:wallDrag.widthMm,heightMm:wallDrag.heightMm,depthMm:wallDrag.depthMm},wallDrag.id);else{const opening=project.room.openings.find((entry)=>entry.id===wallDrag.id);if(opening?.type==='window')applyWindowObject(object,project.room,{...opening,wall:nextWall,offsetMm:offset,sillMm:bottom});else if(opening)applyDoorObject(object,project.room,{...opening,wall:nextWall,offsetMm:offset,sillMm:0})}object.updateMatrixWorld(true)}
   wallWorld.setHighlight(wallDrag.id,!wallDrag.valid);latest.current.onPlacementWarning?.(issue);draw();return
  }
  const drag=dragRef.current,world=worldRef.current;if(!drag||!world||e.pointerId!==drag.pointerId||!rayAt(e))return;const snap=(n:number)=>snapFurnitureMm(n,e.altKey);const original=latest.current.project.instances.find(i=>i.id===drag.id);if(!original)return;const candidate=snapAtRay({...original,centerXMm:snap(hit.x*1000+drag.offsetX),centerZMm:snap(hit.z*1000+drag.offsetZ)});drag.x=candidate.centerXMm;drag.z=candidate.centerZMm;drag.placement=candidate;drag.moved=drag.x!==original.centerXMm||drag.z!==original.centerZMm||candidate.elevationMm!==original.elevationMm;const issue=furniturePlacementIssue(latest.current.project,candidate);drag.valid=!issue;drag.reason=issue;const obj=world.objects.get(drag.id);if(obj){obj.position.set(drag.x/1000,(candidate.elevationMm??0)/1000,drag.z/1000);obj.rotation.y=-(candidate.rotationDegrees??candidate.quarterTurn*90)*Math.PI/180}world.setHighlight(drag.id,!drag.valid);latest.current.onPlacementWarning?.(issue);draw()
 }
 const finish=(e:PointerEvent)=>{
  if(e.pointerType==='touch'){touchesRef.current.delete(e.pointerId);pinchRef.current=null;draw(true);return}
  if(panDragRef.current?.pointerId===e.pointerId){panDragRef.current=null;renderer.domElement.style.cursor=latest.current.interactionMode==='pan'?'grab':'default';return}
  const orbit=orbitRef.current;if(orbit?.pointerId===e.pointerId){orbitRef.current=null;if(!orbit.moved&&orbit.button===0)latest.current.onSelect(null);draw(true);return}
  const wallDrag=wallDragRef.current;if(wallDrag&&e.pointerId===wallDrag.pointerId){wallDragRef.current=null;if(wallDrag.moved&&wallDrag.valid)latest.current.onWallMoveCommit?.(wallDrag.id,wallDrag.wall,wallDrag.offsetMm,wallDrag.bottomMm);else if(!wallDrag.valid)latest.current.onStatus(wallDrag.reason??'This wall position is not available.','warning');latest.current.onPlacementWarning?.(null);const project=latest.current.project,object=worldRef.current?.objects.get(wallDrag.id);if(object){const item=project.wallObjects?.find((entry)=>entry.id===wallDrag.id),opening=project.room.openings.find((entry)=>entry.id===wallDrag.id);if(item)applyWallObject(object,project.room,item);else if(opening?.type==='window')applyWindowObject(object,project.room,opening);else if(opening)applyDoorObject(object,project.room,opening)}worldRef.current?.setHighlight(wallDrag.id);draw();if(!wallDrag.moved)latest.current.onInspect?.(wallDrag.id,objectScreenPoint(wallDrag.id));return}
  const drag=dragRef.current;if(!drag||e.pointerId!==drag.pointerId)return;dragRef.current=null;if(drag.moved&&drag.valid)latest.current.onMoveCommit(drag.id,drag.x,drag.z,drag.placement);else if(!drag.valid)latest.current.onStatus(drag.reason??'Furniture cannot be placed here.','warning');latest.current.onPlacementWarning?.(null);const obj=worldRef.current?.objects.get(drag.id),original=latest.current.project.instances.find(i=>i.id===drag.id);if(obj&&original){obj.position.set(original.centerXMm/1000,(original.elevationMm??0)/1000,original.centerZMm/1000);obj.rotation.y=-(original.rotationDegrees??original.quarterTurn*90)*Math.PI/180}worldRef.current?.setHighlight(drag.id);draw();if(!drag.moved)latest.current.onInspect?.(drag.id,objectScreenPoint(drag.id))
 }
 const pointerCancel=(e:PointerEvent)=>{touchesRef.current.delete(e.pointerId);pinchRef.current=null;if(panDragRef.current?.pointerId===e.pointerId){panDragRef.current=null;renderer.domElement.style.cursor=latest.current.interactionMode==='pan'?'grab':'default'}if(orbitRef.current?.pointerId===e.pointerId)orbitRef.current=null;if(dragRef.current?.pointerId===e.pointerId||wallDragRef.current?.pointerId===e.pointerId)cancel()}
 const wheel=(e:WheelEvent)=>{stopKeyboardMotion();e.preventDefault();if(!latest.current.viewLocked){zoomBy(Math.exp(-e.deltaY*.001));clearTimeout(zoomMetricTimer);zoomMetricTimer=setTimeout(()=>draw(true),200)}}
 const contextMenu=(e:MouseEvent)=>e.preventDefault()
 const clearWallCatalogGhost=()=>{if(!wallCatalogGhost)return;wallCatalogGhost.scene.remove(wallCatalogGhost.object,wallCatalogGhost.outline);if(wallCatalogGhost.kind==='wall')disposeWallModel(wallCatalogGhost.object);else if(wallCatalogGhost.kind==='window')disposeWindowModel(wallCatalogGhost.object);else disposeDoorModel(wallCatalogGhost.object);wallCatalogGhost.outline.geometry.dispose();wallCatalogGhost=null;draw()}
 const clearCatalogGhost=()=>{if(catalogGhost){catalogGhost.scene.remove(catalogGhost.object,catalogGhost.outline);disposeFurniture(catalogGhost.object);catalogGhost.outline.geometry.dispose();catalogGhost=null;draw()}clearWallCatalogGhost();latest.current.onPlacementWarning?.(null)}
 const dragOver=(e:DragEvent)=>{
  if(e.dataTransfer?.types.includes(WALL_DRAG_TYPE)){
   e.preventDefault();e.dataTransfer.dropEffect='copy'
   const item=decodeWallDrag(e.dataTransfer.getData(WALL_DRAG_TYPE))??getActiveWallDrag(),target=wallHitAt(e),world=worldRef.current
   if(!item||!target||!world){ghostGeneration++;clearCatalogGhost();return}
   const concept=item.kind==='wall'?getWallConcept(item.id):undefined,style=item.kind==='window'?getWindowStyle(item.id):undefined,doorStyle=item.kind==='door'?getDoorStyle(item.id):undefined
   if((item.kind==='wall'&&!concept)||(item.kind==='window'&&!style)||(item.kind==='door'&&!doorStyle)){ghostGeneration++;clearCatalogGhost();return}
   const width=concept?.widthMm??style?.widthMm??doorStyle!.widthMm,height=concept?.heightMm??style?.heightMm??doorStyle!.heightMm,depth=concept?.depthMm??(item.kind==='door'?130:60),local=wallLocalPosition(target.wall,target.point),offset=snapFurnitureMm(local.u-width/2,e.altKey),bottom=item.kind==='door'?0:snapFurnitureMm(local.y-height/2,e.altKey),generation=++ghostGeneration,scope={projectId:latest.current.project.id,sessionToken:latest.current.sessionToken},key=`${item.kind}:${item.id}`
   void (item.kind==='door'?prepareDoorModels():prepareWallModels()).then(()=>{
    if(disposed||generation!==ghostGeneration||!sameEditingScope(scope,{projectId:latest.current.project.id,sessionToken:latest.current.sessionToken})||worldRef.current!==world)return
    try{
     if(!wallCatalogGhost||wallCatalogGhost.key!==key||wallCatalogGhost.scene!==world.scene){clearCatalogGhost();const opening:WindowOpening={id:'wall-preview',type:'window',wall:target.wall,offsetMm:0,widthMm:width,heightMm:height,sillMm:style?.sillMm??0,styleId:style?.id},object=item.kind==='wall'?buildWallPreview(item.id,{...concept!.defaults}):item.kind==='window'?buildWindowPreview(opening):buildDoorPreview(doorStyle!,width,height),outline=new THREE.BoxHelper(object,0x296b56);outline.material.dispose();outline.material=previewMaterial(false);outline.renderOrder=10;world.scene.add(object,outline);wallCatalogGhost={key,scene:world.scene,object,outline,kind:item.kind}}
     const candidate:WallAttachmentGeometry={wall:target.wall,offsetMm:offset,bottomMm:bottom,widthMm:width,heightMm:height,depthMm:depth}
     const door=doorOpening(item.id,target.wall,offset);let issue=item.kind==='wall'?wallObjectIssue(latest.current.project,{...candidate,id:'wall-preview'}):item.kind==='window'?windowIssue(latest.current.project,{id:'wall-preview',type:'window',wall:target.wall,offsetMm:offset,widthMm:width,heightMm:height,sillMm:bottom,styleId:style!.id}):door?doorwayIssue(latest.current.project,door):'Unknown door design.'
     if(item.kind==='wall'&&latest.current.project.instances.length+(latest.current.project.wallObjects?.length??0)>=24)issue='This room already has 24 objects. Remove one before adding another.'
     if(item.kind==='wall')applyWallAttachmentPose(wallCatalogGhost.object,latest.current.project.room,candidate,'wall-preview')
     else if(item.kind==='window')applyWindowObject(wallCatalogGhost.object,latest.current.project.room,{id:'wall-preview',type:'window',wall:target.wall,offsetMm:offset,widthMm:width,heightMm:height,sillMm:bottom,styleId:style!.id})
     else if(door)applyDoorObject(wallCatalogGhost.object,latest.current.project.room,{...door,widthMm:width,heightMm:height})
     wallCatalogGhost.object.updateMatrixWorld(true);wallCatalogGhost.outline.setFromObject(wallCatalogGhost.object);wallCatalogGhost.outline.material=previewMaterial(!!issue);latest.current.onPlacementWarning?.(issue);draw()
    }catch(error){console.error('Wall object preview could not load:',error);latest.current.onStatus('Wall object preview could not load. Please try again.','error')}
   },error=>{if(!disposed&&generation===ghostGeneration&&sameEditingScope(scope,{projectId:latest.current.project.id,sessionToken:latest.current.sessionToken})){console.error('Wall object preview could not load:',error);latest.current.onStatus('Wall object preview could not load. Please try again.','error')}})
   return
  }
  if(!e.dataTransfer?.types.includes(FURNITURE_DRAG_TYPE))return
  clearWallCatalogGhost()
  e.preventDefault();e.dataTransfer.dropEffect='copy'
  const id=getActiveFurnitureDrag(),concept=id?getConcept(2,id):undefined,world=worldRef.current
  if(!id||!concept?.available||!world||!rayAt(e)){ghostGeneration++;clearCatalogGhost();return}
  const x=snapFurnitureMm(hit.x*1000,e.altKey),z=snapFurnitureMm(hit.z*1000,e.altKey),generation=++ghostGeneration,scope={projectId:latest.current.project.id,sessionToken:latest.current.sessionToken},candidate=snapAtRay({id:'catalog-preview',conceptId:id,centerXMm:x,centerZMm:z,quarterTurn:0,finishes:defaultFinishes(concept)})
  void prepareFurniture([id]).then(()=>{
   if(disposed||generation!==ghostGeneration||!sameEditingScope(scope,{projectId:latest.current.project.id,sessionToken:latest.current.sessionToken})||getActiveFurnitureDrag()!==id||worldRef.current!==world)return
   try{
    if(!catalogGhost||catalogGhost.id!==id||catalogGhost.scene!==world.scene){clearCatalogGhost();const object=buildFurniture({id:'catalog-preview',conceptId:id,centerXMm:0,centerZMm:0,quarterTurn:0,finishes:defaultFinishes(concept)}),outline=new THREE.BoxHelper(object,0x296b56);outline.material.dispose();outline.material=previewMaterial(false);outline.renderOrder=10;world.scene.add(object,outline);catalogGhost={id,scene:world.scene,object,outline}}
    const issue=furniturePlacementIssue(latest.current.project,candidate)
    catalogGhost.object.position.set(candidate.centerXMm/1000,(candidate.elevationMm??0)/1000,candidate.centerZMm/1000);catalogGhost.object.rotation.y=-(candidate.rotationDegrees??candidate.quarterTurn*90)*Math.PI/180;catalogGhost.object.updateMatrixWorld(true);catalogGhost.outline.setFromObject(catalogGhost.object);catalogGhost.outline.material=previewMaterial(!!issue);latest.current.onPlacementWarning?.(issue);draw()
   }catch(error){console.error('Furniture preview could not load:',error);latest.current.onStatus('Furniture preview could not load. Please try again.','error')}
  },error=>{if(!disposed&&generation===ghostGeneration&&sameEditingScope(scope,{projectId:latest.current.project.id,sessionToken:latest.current.sessionToken})){console.error('Furniture preview could not load:',error);latest.current.onStatus('Furniture preview could not load. Please try again.','error')}})
 }
 const drop=(e:DragEvent)=>{
  const wallItem=decodeWallDrag(e.dataTransfer?.getData(WALL_DRAG_TYPE)??'')??getActiveWallDrag()
  if(wallItem&&e.dataTransfer?.types.includes(WALL_DRAG_TYPE)){
   e.preventDefault();ghostGeneration++;const target=wallHitAt(e)
   if(!target){clearCatalogGhost();latest.current.onStatus('Drop the item onto a visible wall.','warning');return}
   const concept=wallItem.kind==='wall'?getWallConcept(wallItem.id):undefined,style=wallItem.kind==='window'?getWindowStyle(wallItem.id):undefined,doorStyle=wallItem.kind==='door'?getDoorStyle(wallItem.id):undefined
   if((wallItem.kind==='wall'&&!concept)||(wallItem.kind==='window'&&!style)||(wallItem.kind==='door'&&!doorStyle)){clearCatalogGhost();return}
   const width=concept?.widthMm??style?.widthMm??doorStyle!.widthMm,height=concept?.heightMm??style?.heightMm??doorStyle!.heightMm,depth=concept?.depthMm??(wallItem.kind==='door'?130:60),local=wallLocalPosition(target.wall,target.point),offset=snapFurnitureMm(local.u-width/2,e.altKey),bottom=wallItem.kind==='door'?0:snapFurnitureMm(local.y-height/2,e.altKey),door=wallItem.kind==='door'?doorOpening(wallItem.id,target.wall,offset):undefined
   const issue=wallItem.kind==='wall'?wallObjectIssue(latest.current.project,{wall:target.wall,offsetMm:offset,bottomMm:bottom,widthMm:width,heightMm:height,depthMm:depth}):wallItem.kind==='window'?windowIssue(latest.current.project,{id:'wall-preview',type:'window',wall:target.wall,offsetMm:offset,widthMm:width,heightMm:height,sillMm:bottom,styleId:style!.id}):door?doorwayIssue(latest.current.project,door):'Unknown door design.'
   clearCatalogGhost();if(issue)latest.current.onStatus(issue,'warning');else latest.current.onWallAddAt?.(wallItem,target.wall,offset,bottom);return
  }
  const id=e.dataTransfer?.getData(FURNITURE_DRAG_TYPE);if(!id)return;e.preventDefault();ghostGeneration++
  const concept=getConcept(2,id);if(!concept?.available||!rayAt(e)){clearCatalogGhost();latest.current.onStatus('Drop the furniture inside the room.','warning');return}
  const x=snapFurnitureMm(hit.x*1000,e.altKey),z=snapFurnitureMm(hit.z*1000,e.altKey),scope={projectId:latest.current.project.id,sessionToken:latest.current.sessionToken},generation=++dropGeneration,candidate=snapAtRay({id:'catalog-preview',conceptId:id,centerXMm:x,centerZMm:z,quarterTurn:0,finishes:defaultFinishes(concept)})
  clearCatalogGhost()
  void prepareFurniture([id]).then(()=>{if(disposed||generation!==dropGeneration||!sameEditingScope(scope,{projectId:latest.current.project.id,sessionToken:latest.current.sessionToken}))return;const issue=furniturePlacementIssue(latest.current.project,candidate);if(issue)latest.current.onStatus(issue,'warning');else latest.current.onAddAt?.(id,candidate.centerXMm,candidate.centerZMm,candidate)},error=>{if(!disposed&&generation===dropGeneration&&sameEditingScope(scope,{projectId:latest.current.project.id,sessionToken:latest.current.sessionToken})){console.error('Furniture could not load:',error);latest.current.onStatus('Furniture could not load. Please try again.','error')}})
 }
 const clearDragPreview=()=>{ghostGeneration++;clearCatalogGhost()}
 const key=(e:KeyboardEvent)=>{
  const target=e.target as HTMLElement
  if(!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!target.closest('input,textarea,select,dialog,[contenteditable=true]')&&!latest.current.viewLocked){
   const k=e.key.toLowerCase()
   if(k==='+'||k==='='||k==='-'||'wasdqe'.includes(k)){e.preventDefault();const base=keyboardTargetRef.current??{pose:poseRef.current,zoom:zoomRef.current},pose={...base.pose};let nextZoom=base.zoom
    if(k==='+'||k==='=')nextZoom=clampZoom(nextZoom+.25)
    else if(k==='-')nextZoom=clampZoom(nextZoom-.25)
    else if(k==='q'||k==='e')pose.azimuth+=(k==='q'?-1:1)*Math.PI/6
    else{const step=.15/base.zoom;pose.panX=(pose.panX??0)+(k==='a'?-step:k==='d'?step:0);pose.panY=(pose.panY??0)+(k==='w'?step:k==='s'?-step:0)}
    animateKeyboardCamera(pose,nextZoom);return
   }
  }
  if(e.key==='Escape'&&!e.defaultPrevented){cancel();panDragRef.current=null;renderer.domElement.style.cursor=latest.current.interactionMode==='pan'?'grab':'default';orbitRef.current=null;touchesRef.current.clear();pinchRef.current=null}}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',finish);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('contextmenu',contextMenu);renderer.domElement.addEventListener('dragover',dragOver);renderer.domElement.addEventListener('dragleave',clearDragPreview);renderer.domElement.addEventListener('drop',drop);window.addEventListener('dragend',clearDragPreview);window.addEventListener('keydown',key)
 ;(drawRef as React.MutableRefObject<(()=>void)&{resize?:()=>void;benchmark?:()=>void}>).current=Object.assign(draw,{resize,refit,benchmark:startBenchmark,invalidateSession:()=>{ghostGeneration++;dropGeneration++;clearCatalogGhost()}})
 return()=>{disposed=true;syncGate.invalidate();ghostGeneration++;dropGeneration++;stopKeyboardMotion();clearCatalogGhost();cancelAnimationFrame(raf);clearTimeout(zoomMetricTimer);observer.disconnect();window.removeEventListener('keydown',key);window.removeEventListener('dragend',clearDragPreview);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',finish);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('contextmenu',contextMenu);renderer.domElement.removeEventListener('dragover',dragOver);renderer.domElement.removeEventListener('dragleave',clearDragPreview);renderer.domElement.removeEventListener('drop',drop);worldRef.current?.dispose();worldRef.current=null;renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();rendererRef.current=null}
 },[])
 useEffect(()=>{const fn=drawRef.current as (()=>void)&{resize?:()=>void};fn.resize?.()},[props.project,props.view,props.selectedId,props.diagnostics,props.nightMode])
 useEffect(()=>{
  if(props.animationsEnabled===false)return
  const hasBreeze=props.project.instances.some((item)=>item.breezeEnabled===true)||props.project.room.openings.some((item)=>item.type==='window'&&item.treatment==='curtains'&&item.breezeEnabled===true)
  if(!hasBreeze)return
  const motion=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null
  let frame=0,visible=true
  const animate=()=>{if(motion?.matches||document.hidden||!visible){frame=0;return}drawRef.current();frame=requestAnimationFrame(animate)}
  const syncMotion=()=>{if(motion?.matches||document.hidden||!visible){cancelAnimationFrame(frame);frame=0}else if(!frame)frame=requestAnimationFrame(animate)}
  const observer=typeof IntersectionObserver==='undefined'?undefined:new IntersectionObserver((entries)=>{visible=entries.some((entry)=>entry.isIntersecting);syncMotion()})
  if(host.current)observer?.observe(host.current)
  syncMotion();motion?.addEventListener('change',syncMotion);document.addEventListener('visibilitychange',syncMotion)
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();motion?.removeEventListener('change',syncMotion);document.removeEventListener('visibilitychange',syncMotion)}
 },[props.project,props.animationsEnabled])
 useEffect(()=>{const fn=drawRef.current as (()=>void)&{invalidateSession?:()=>void};fn.invalidateSession?.()},[props.sessionToken])
 useEffect(()=>{if(props.viewLocked)return;zoomRef.current=clampZoom(props.zoom);const fn=drawRef.current as (()=>void)&{refit?:()=>void};fn.refit?.()},[props.zoom,props.viewLocked])
 useEffect(()=>{rendererRef.current?.domElement && (rendererRef.current.domElement.style.cursor=props.interactionMode==='pan'?'grab':'default');if(props.interactionMode!=='pan')panDragRef.current=null},[props.interactionMode])
 useEffect(()=>{if(props.viewLocked){stopKeyboardMotion();panDragRef.current=null;orbitRef.current=null;touchesRef.current.clear();pinchRef.current=null}drawRef.current(true)},[props.viewLocked])
 useEffect(()=>{worldRef.current?.setWallsUp(!!props.wallsUp);drawRef.current()},[props.wallsUp])
 useEffect(()=>{worldRef.current?.setAnimationsEnabled(props.animationsEnabled!==false);drawRef.current()},[props.animationsEnabled])
 useEffect(()=>{const preview=props.rotationPreview,previous=rotationPreviewRef.current;rotationPreviewRef.current=preview??null;const ids=[...new Set([previous?.id,preview?.id].filter((id):id is string=>!!id))];if(!ids.length)return;for(const id of ids){const object=worldRef.current?.objects.get(id),item=latest.current.project.instances.find(entry=>entry.id===id);if(object&&item){const degrees=preview?.id===id?preview.degrees:(item.rotationDegrees??item.quarterTurn*90);object.rotation.y=-degrees*Math.PI/180;object.updateMatrixWorld(true)}}worldRef.current?.setHighlight(props.selectedId);drawRef.current()},[props.rotationPreview,props.selectedId,props.project])
 useEffect(()=>{if(props.resetToken!==resetRef.current){stopKeyboardMotion();resetRef.current=props.resetToken;if(!props.viewLocked){poseRef.current=canonicalPose();updateAxisPose(poseRef.current);zoomRef.current=DEFAULT_VIEW_ZOOM;props.onZoomChange?.(DEFAULT_VIEW_ZOOM);const fn=drawRef.current as (()=>void)&{refit?:()=>void};fn.refit?.()}}},[props.resetToken,props.viewLocked,props.onZoomChange])
 useEffect(()=>{if(props.diagnostics&&props.benchmarkToken!==undefined&&props.benchmarkToken>0&&props.benchmarkToken!==tokenRef.current){tokenRef.current=props.benchmarkToken;const fn=drawRef.current as (()=>void)&{benchmark?:()=>void};fn.benchmark?.()}},[props.benchmarkToken,props.diagnostics])
 useEffect(()=>{const command=props.cameraCommand;if(!command||command.token===commandRef.current)return;commandRef.current=command.token;stopKeyboardMotion();if(props.viewLocked||props.view==='top')return;poseRef.current='pose'in command?command.pose:stepPose(poseRef.current,command.turnDegrees,command.tiltDegrees);updateAxisPose(poseRef.current);const fn=drawRef.current as (()=>void)&{refit?:()=>void};fn.refit?.()},[props.cameraCommand,props.viewLocked,props.view])
 return <div className="room-viewport-shell"><div ref={host} aria-label="Room view" className="room-viewport-canvas">{loadError && <div role="alert" style={{position:'absolute',top:96,left:'50%',transform:'translateX(-50%)',width:'min(28rem, calc(100% - 2rem))',zIndex:2,background:'#f7f5f0',padding:'1rem',whiteSpace:'normal',overflowWrap:'anywhere'}}>{loadError} <button type="button" onClick={()=>{const fn=drawRef.current as (()=>void)&{resize?:()=>void};fn.resize?.()}}>Retry</button></div>}{renderError && <p role="alert" style={{position:'absolute',inset:0,margin:0,padding:'1rem',background:'#f7f5f0',color:'#702d25',zIndex:1}}>{renderError}</p>}</div><AxisWidget mode="3d" pose={axisPose} locked={!!props.viewLocked} onSelect={props.onAxisSelect} /></div>
}
