import * as THREE from 'three'
import type { Project, Wall } from '../domain/types'
import { canonicalPose, nearWalls, type CameraPose } from './camera'
import { buildFurniture, disposeFurniture, updateFurniture, clearUnusedFurnitureGeometry } from '../assets/models'
import { applyWallObject, applyWindowObject, buildWallObject, buildWindowObject, disposeWallModel, disposeWindowModel } from '../assets/wallModels'
import { applyDoorObject, buildDoorObject, disposeDoorModel } from '../assets/doorModels'
import { getWallConcept } from '../catalog/wall'
import { getDoorStyle } from '../catalog/doors'
import { getPlanPrimitives, getRoomInnerWallBands, getRoomOutline, getRoomSlabOutline, openingBasis, openingPoints, wallSegments } from '../geometry'

const wallMaterial=new THREE.MeshStandardMaterial({color:'#eeeae1',roughness:1})
const curvedWallMaterial=new THREE.MeshStandardMaterial({color:'#eeeae1',roughness:1,side:THREE.DoubleSide})
const floorMaterial=new THREE.MeshStandardMaterial({color:'#b99570',roughness:1,side:THREE.DoubleSide})
const lineMaterial=new THREE.LineBasicMaterial({color:'#6d756c'})
const selectMaterial=new THREE.LineBasicMaterial({color:'#296b56',depthTest:false})
const invalidMaterial=new THREE.LineBasicMaterial({color:'#bf4032',depthTest:false})
export function previewMaterial(invalid:boolean){return invalid?invalidMaterial:selectMaterial}
function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,cast=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;return m}
function line(points:THREE.Vector3[],mat:THREE.Material=lineMaterial){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat)}
function dFrontWall(width:number,depth:number,height:number){
 const segments=64,halfThickness=.05,positions:number[]=[],centerX=width/2,radius=width/2,centerZ=depth-radius,radiusX=radius,radiusZ=radius
 const point=(angle:number,offset:number,y:number):[number,number,number]=>{const cos=Math.cos(angle),sin=Math.sin(angle),nx=cos/radiusX,nz=sin/radiusZ,length=Math.hypot(nx,nz)||1;return[centerX+radiusX*cos+nx/length*offset,y,centerZ+radiusZ*sin+nz/length*offset]}
 const quad=(a:[number,number,number],b:[number,number,number],c:[number,number,number],d:[number,number,number])=>positions.push(...a,...b,...c,...a,...c,...d)
 for(let index=0;index<segments;index++){
  const a=Math.PI*index/segments,b=Math.PI*(index+1)/segments
  const outerBottomA=point(a,halfThickness*2,0),outerBottomB=point(b,halfThickness*2,0),outerTopA=point(a,halfThickness*2,height),outerTopB=point(b,halfThickness*2,height)
  const innerBottomA=point(a,0,0),innerBottomB=point(b,0,0),innerTopA=point(a,0,height),innerTopB=point(b,0,height)
  quad(outerBottomA,outerBottomB,outerTopB,outerTopA)
  quad(innerBottomB,innerBottomA,innerTopA,innerTopB)
  quad(outerTopA,innerTopA,innerTopB,outerTopB)
  quad(outerBottomB,innerBottomB,innerBottomA,outerBottomA)
  if(index===0)quad(outerBottomA,innerBottomA,innerTopA,outerTopA)
  if(index===segments-1)quad(innerBottomB,outerBottomB,outerTopB,innerTopB)
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals()
 const mesh=new THREE.Mesh(geometry,curvedWallMaterial);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='d-room-curved-front-wall';return mesh
}
function groundGridMaterial(w:number,d:number,fadeStart:number,fadeEnd:number,nightMode=false){
 const material=new THREE.MeshStandardMaterial({color:nightMode?'#101a2b':'#f3f6f6',roughness:1,transparent:!nightMode,depthWrite:nightMode,side:THREE.DoubleSide})
 material.onBeforeCompile=shader=>{
  shader.uniforms.uGridCenter={value:new THREE.Vector2(w/2,d/2)}
  shader.uniforms.uFadeStart={value:fadeStart}
  shader.uniforms.uFadeEnd={value:fadeEnd}
  shader.uniforms.uMinorGridColor={value:new THREE.Color(nightMode?'#1a2940':'#dce5e9')}
  shader.uniforms.uMajorGridColor={value:new THREE.Color(nightMode?'#243650':'#c5d3dc')}
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundWorldPosition;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGroundWorldPosition = worldPosition.xyz;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vGroundWorldPosition;
uniform vec2 uGridCenter;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform vec3 uMinorGridColor;
uniform vec3 uMajorGridColor;
float nookGridLine(vec2 coordinate) {
  vec2 derivativeWidth = max(fwidth(coordinate), vec2(0.0001));
  vec2 grid = abs(fract(coordinate - 0.5) - 0.5) / derivativeWidth;
  return 1.0 - min(min(grid.x, grid.y), 1.0);
}`).replace('#include <color_fragment>',`#include <color_fragment>
vec2 groundCoordinates = vGroundWorldPosition.xz - uGridCenter;
float minorGrid = nookGridLine(groundCoordinates * 2.0);
float majorGrid = nookGridLine(groundCoordinates * 0.5);
diffuseColor.rgb = mix(diffuseColor.rgb, uMinorGridColor, minorGrid * 0.34);
diffuseColor.rgb = mix(diffuseColor.rgb, uMajorGridColor, majorGrid * 0.52);
float groundDistance = length(groundCoordinates);
diffuseColor.a *= 1.0 - smoothstep(uFadeStart, uFadeEnd, groundDistance);`)
 }
 material.customProgramCacheKey=()=> 'nook-ground-grid-v1'
 return material
}
export type World = { scene:THREE.Scene; camera:THREE.OrthographicCamera; objects:Map<string,THREE.Group>; wallGroups:Map<Wall,THREE.Group>; dispose:()=>void; setHighlight:(id:string|null,invalid?:boolean)=>void; setCamera:(pose:CameraPose,zoom:number,width:number,height:number)=>void; setWallsUp:(visible:boolean)=>void; setAnimationsEnabled:(enabled:boolean)=>void; updateProject:(project:Project,selectedId:string|null,skipId?:string)=>void }
export function createWorld(project:Project, view:'isometric'|'top', zoom:number, width:number,height:number, selectedId:string|null=null, pose:CameraPose=canonicalPose(), showGround=true, initialWallsUp=false, initialAnimationsEnabled=true, nightMode=false):World {
 const {room}=project,w=room.widthMm/1000,d=room.depthMm/1000,h=room.heightMm/1000;const scene=new THREE.Scene();scene.background=new THREE.Color(nightMode?'#091426':showGround?'#c9e1f8':'#eae9e5');scene.userData.animationsEnabled=initialAnimationsEnabled
 const hemisphere=new THREE.HemisphereLight(nightMode?'#a7bcdf':'#ffffff',nightMode?'#596276':'#b7a48f',nightMode ? 1.25 : 2.0),sun=new THREE.DirectionalLight(nightMode?'#c4d5fa':'#fff4e3',nightMode ? 1.3 : 2.1);scene.add(hemisphere);sun.position.set(-4,8,5);sun.target.position.set(w/2,0,d/2);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-Math.max(w,d);sun.shadow.camera.right=Math.max(w,d);sun.shadow.camera.top=Math.max(w,d);sun.shadow.camera.bottom=-Math.max(w,d);sun.shadow.camera.near=.1;sun.shadow.camera.far=50;sun.shadow.bias=-0.0004;sun.shadow.normalBias=.02;sun.shadow.radius=2
 const span=Math.max(w,d),fadeStart=span*1.18,fadeEnd=span*2.05,groundMaterial=showGround?groundGridMaterial(w,d,fadeStart,fadeEnd,nightMode):null,ground=groundMaterial?new THREE.Mesh(new THREE.PlaneGeometry(fadeEnd*2,fadeEnd*2),groundMaterial):null;if(ground){ground.rotation.x=-Math.PI/2;ground.position.set(w/2,-.082,d/2);ground.receiveShadow=true;ground.name='ground-reference-grid';scene.add(ground)}
 let horizonDepthMaterial:THREE.MeshBasicMaterial|undefined
 if(nightMode&&!showGround){horizonDepthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});const horizon=new THREE.Mesh(new THREE.PlaneGeometry(fadeEnd*2,fadeEnd*2),horizonDepthMaterial);horizon.rotation.x=-Math.PI/2;horizon.position.set(w/2,-.082,d/2);horizon.name='invisible-night-horizon';scene.add(horizon)}
 let nightStars:THREE.Points|undefined
 if(nightMode){const positions:THREE.Vector3[]=[],radius=Math.max(span*6.5,80);for(let index=0;index<180;index++){const y=.12+index/179*.88,angle=index*2.399963229728653,horizontal=Math.sqrt(1-y*y);positions.push(new THREE.Vector3(w/2+Math.cos(angle)*horizontal*radius,h/2+y*radius,d/2+Math.sin(angle)*horizontal*radius))}const geometry=new THREE.BufferGeometry().setFromPoints(positions),material=new THREE.PointsMaterial({color:'#e7edff',size:2.2,sizeAttenuation:false,transparent:true,opacity:.82,depthWrite:false});nightStars=new THREE.Points(geometry,material);nightStars.name='night-sky-stars';scene.add(nightStars)}
 const outline=getRoomOutline(room),slabOutline=getRoomSlabOutline(room),floorShape=new THREE.Shape();slabOutline.forEach((point,index)=>{const x=point.x/1000,z=-point.z/1000;if(index===0)floorShape.moveTo(x,z);else floorShape.lineTo(x,z)});floorShape.closePath();const floorGeometry=new THREE.ExtrudeGeometry(floorShape,{depth:.08,bevelEnabled:false}),floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;floor.castShadow=false;scene.add(floor)
 const internalWallGroups:{group:THREE.Group;hideWhen:Wall}[]=[]
 const wallGroups=new Map<Wall,THREE.Group>();for(const wall of ['N','E','S','W'] as Wall[]){const group=new THREE.Group();group.userData.wall=wall;wallGroups.set(wall,group);scene.add(group)}
 for(const s of wallSegments(room,project.wallObjects??[])){if(view==='top')continue;const len=(s.end-s.start)/1000,height0=(s.top-s.bottom)/1000,along=(s.start+s.end)/2000,y=(s.bottom+s.top)/2000;let b:THREE.Mesh;if(s.wall==='N'||s.wall==='S')b=box(len,height0,.1,along,y,s.wall==='N'?-.05:d+.05,wallMaterial,false);else b=box(.1,height0,len,s.wall==='W'?-.05:w+.05,y,along,wallMaterial,false);wallGroups.get(s.wall)?.add(b)}
 if(view==='isometric'&&room.shape==='d-shape')wallGroups.get('S')?.add(dFrontWall(w,d,h))
 if(view==='isometric')for(const [index,band] of getRoomInnerWallBands(room).entries()){const group=new THREE.Group(),mesh=box(band.widthMm/1000,h,band.depthMm/1000,(band.xMm+band.widthMm/2)/1000,h/2,(band.zMm+band.depthMm/2)/1000,wallMaterial,false);group.add(mesh);scene.add(group);internalWallGroups.push({group,hideWhen:index===0?'S':'E'})}
 const plan=getPlanPrimitives(project); if(view==='top')for(const b of plan.walls)scene.add(box(b.widthMm/1000,.02,b.depthMm/1000,(b.xMm+b.widthMm/2)/1000,.012,(b.zMm+b.depthMm/2)/1000,wallMaterial,false));
 const edge=(x1:number,z1:number,x2:number,z2:number)=>scene.add(line([new THREE.Vector3(x1,.016,z1),new THREE.Vector3(x2,.016,z2)]));if(view==='isometric')for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];edge(a.x/1000,a.z/1000,b.x/1000,b.z/1000)}
 if(view==='top')for(const opening of room.openings){
  const {a,end,basis}=openingPoints(room,opening)
  if(opening.type==='window'){
   for(const n of [-.02,.02])edge(a.x/1000+basis.ix*n,a.z/1000+basis.iz*n,end.x/1000+basis.ix*n,end.z/1000+basis.iz*n)
  }else if(opening.type==='archway'){
   edge(a.x/1000,a.z/1000,(a.x+basis.ix*100)/1000,(a.z+basis.iz*100)/1000)
   edge(end.x/1000,end.z/1000,(end.x+basis.ix*100)/1000,(end.z+basis.iz*100)/1000)
  }else{
   const style=opening.styleId?getDoorStyle(opening.styleId):undefined,sidelight=style?.sidelightMm??0,leafWidth=opening.widthMm-2*sidelight
   const leaves=style?.leafCount===2?[{offset:0,width:opening.widthMm/2,hinge:'min' as const},{offset:opening.widthMm/2,width:opening.widthMm/2,hinge:'max' as const}]:[{offset:sidelight,width:leafWidth,hinge:opening.hinge}]
   if(sidelight){const left={x:a.x+basis.tx*sidelight,z:a.z+basis.tz*sidelight},right={x:end.x-basis.tx*sidelight,z:end.z-basis.tz*sidelight};edge(a.x/1000,a.z/1000,left.x/1000,left.z/1000);edge(right.x/1000,right.z/1000,end.x/1000,end.z/1000)}
   for(const leaf of leaves){
    const hingeOffset=leaf.offset+(leaf.hinge==='min'?0:leaf.width),closedOffset=leaf.offset+(leaf.hinge==='min'?leaf.width:0),hinge={x:a.x+basis.tx*hingeOffset,z:a.z+basis.tz*hingeOffset},closed={x:a.x+basis.tx*closedOffset,z:a.z+basis.tz*closedOffset},open={x:hinge.x+basis.ix*leaf.width,z:hinge.z+basis.iz*leaf.width}
    edge(hinge.x/1000,hinge.z/1000,open.x/1000,open.z/1000)
    const startAngle=Math.atan2(closed.z-hinge.z,closed.x-hinge.x),finishAngle=Math.atan2(open.z-hinge.z,open.x-hinge.x)
    let delta=finishAngle-startAngle
    while(delta>Math.PI)delta-=2*Math.PI
    while(delta< -Math.PI)delta+=2*Math.PI
    const points=Array.from({length:25},(_,i)=>new THREE.Vector3((hinge.x+leaf.width*Math.cos(startAngle+delta*i/24))/1000,.025,(hinge.z+leaf.width*Math.sin(startAngle+delta*i/24))/1000))
    scene.add(line(points))
   }
  }
 }
 const objects=new Map<string,THREE.Group>(),wallObjects=new Map<string,THREE.Group>(),windowObjects=new Map<string,THREE.Group>(),doorObjects=new Map<string,THREE.Group>()
 for(const item of [...project.instances].sort((a,b)=>a.id.localeCompare(b.id))){const obj=buildFurniture(item);objects.set(item.id,obj);scene.add(obj)}
 for(const item of project.wallObjects??[]){const obj=buildWallObject(room,item);wallObjects.set(item.id,obj);objects.set(item.id,obj);scene.add(obj)}
 if(view==='isometric')for(const opening of room.openings)if(opening.type==='window'){const obj=buildWindowObject(room,opening);windowObjects.set(opening.id,obj);objects.set(opening.id,obj);scene.add(obj)}
 if(view==='isometric')for(const opening of room.openings)if(opening.type==='door'||opening.type==='archway'){const obj=buildDoorObject(room,opening);doorObjects.set(opening.id,obj);objects.set(opening.id,obj);scene.add(obj)}
 const highlight=new THREE.BoxHelper(new THREE.Object3D());highlight.material=selectMaterial;highlight.visible=false;highlight.renderOrder=10;scene.add(highlight)
 function setHighlight(id:string|null,invalid=false){const object=id?objects.get(id):null;highlight.visible=!!object;if(object){highlight.setFromObject(object);highlight.material=invalid?invalidMaterial:selectMaterial}}
 let reveal:THREE.Line|null=null;let revealWall:Wall|null=null;let currentSelection:string|null=null;let selectionKey=''
 function setSelection(id:string|null,nextProject:Project){
  const opening=id?nextProject.room.openings.find(o=>o.id===id):undefined,wallObject=id?(nextProject.wallObjects??[]).find(o=>o.id===id):undefined,wallConcept=wallObject?getWallConcept(wallObject.conceptId):undefined,revealOpening=opening??(wallObject&&wallConcept?{id:wallObject.id,wall:wallObject.wall,offsetMm:wallObject.offsetMm,widthMm:wallConcept.widthMm,sillMm:wallObject.bottomMm,heightMm:wallConcept.heightMm,type:'window' as const}:undefined),key=revealOpening&&view==='isometric'?JSON.stringify(revealOpening):''
  if(currentSelection!==id||selectionKey!==key){
   if(reveal){scene.remove(reveal);reveal.geometry.dispose();reveal=null;revealWall=null}
   currentSelection=id;selectionKey=key
   if(revealOpening&&view==='isometric'){const opening=revealOpening;const {a,end}=openingPoints(room,opening);const basis=openingBasis(room,opening.wall),wallStart={x:basis.x,z:basis.z},wallEnd={x:basis.x+basis.tx*basis.length,z:basis.z+basis.tz*basis.length};const p=(v:{x:number;z:number},y:number)=>new THREE.Vector3(v.x/1000,y,v.z/1000);reveal=line([p(wallStart,0),p(wallStart,h),p(wallEnd,h),p(wallEnd,0),p(wallStart,0),p(a,opening.sillMm/1000),p(end,opening.sillMm/1000),p(end,(opening.sillMm+opening.heightMm)/1000),p(a,(opening.sillMm+opening.heightMm)/1000),p(a,opening.sillMm/1000)],selectMaterial);reveal.name='wall-selection-reveal';revealWall=opening.wall;scene.add(reveal)}
  }
  setHighlight(id)
 }
 function updateProject(next:Project,id:string|null,skipId?:string){
  const wanted=new Set(next.instances.map(item=>item.id)),wantedWall=new Set((next.wallObjects??[]).map(item=>item.id)),wantedWindows=new Set(view==='isometric'?next.room.openings.filter((item)=>item.type==='window').map(item=>item.id):[]),wantedDoors=new Set(view==='isometric'?next.room.openings.filter((item)=>item.type==='door'||item.type==='archway').map(item=>item.id):[])
  for(const [key,obj] of objects)if(!wallObjects.has(key)&&!windowObjects.has(key)&&!doorObjects.has(key)&&!wanted.has(key)){scene.remove(obj);disposeFurniture(obj);objects.delete(key)}
  for(const item of next.instances){const obj=objects.get(item.id);if(!obj){const created=buildFurniture(item);objects.set(item.id,created);scene.add(created)}else if(item.id!==skipId)updateFurniture(obj,item)}
  for(const [key,obj] of wallObjects)if(!wantedWall.has(key)){scene.remove(obj);disposeWallModel(obj);wallObjects.delete(key);objects.delete(key)}
  for(const item of next.wallObjects??[]){let obj=wallObjects.get(item.id);if(obj&&obj.name!==item.conceptId){scene.remove(obj);disposeWallModel(obj);wallObjects.delete(item.id);objects.delete(item.id);obj=undefined}if(!obj){obj=buildWallObject(next.room,item);wallObjects.set(item.id,obj);objects.set(item.id,obj);scene.add(obj)}else applyWallObject(obj,next.room,item)}
  for(const [key,obj] of windowObjects)if(!wantedWindows.has(key)){scene.remove(obj);disposeWindowModel(obj);windowObjects.delete(key);objects.delete(key)}
  if(view==='isometric')for(const opening of next.room.openings)if(opening.type==='window'){const key=`window:${opening.styleId??'plain'}:${opening.widthMm}:${opening.heightMm}:${opening.treatment??'none'}`;let obj=windowObjects.get(opening.id);if(obj&&obj.name!==key){scene.remove(obj);disposeWindowModel(obj);windowObjects.delete(opening.id);objects.delete(opening.id);obj=undefined}if(!obj){obj=buildWindowObject(next.room,opening);windowObjects.set(opening.id,obj);objects.set(opening.id,obj);scene.add(obj)}else applyWindowObject(obj,next.room,opening)}
  for(const [key,obj] of doorObjects)if(!wantedDoors.has(key)){scene.remove(obj);disposeDoorModel(obj);doorObjects.delete(key);objects.delete(key)}
  if(view==='isometric')for(const opening of next.room.openings)if(opening.type==='door'||opening.type==='archway'){const key=`door:${opening.type}:${opening.styleId??'legacy'}:${opening.widthMm}:${opening.heightMm}:${opening.finish??''}`;let obj=doorObjects.get(opening.id);if(obj&&obj.name!==key){scene.remove(obj);disposeDoorModel(obj);doorObjects.delete(opening.id);objects.delete(opening.id);obj=undefined}if(!obj){obj=buildDoorObject(next.room,opening);doorObjects.set(opening.id,obj);objects.set(opening.id,obj);scene.add(obj)}else applyDoorObject(obj,next.room,opening)}
  setSelection(id,next);updateWallVisibility()
 }
 setSelection(selectedId,project)
 const camera=new THREE.OrthographicCamera();let hidden:Set<Wall>|undefined,wallsUp=initialWallsUp
 function updateWallVisibility(){if(view!=='isometric')return;for(const [wall,group] of wallGroups)group.visible=wallsUp||!hidden?.has(wall);for(const {group,hideWhen} of internalWallGroups)group.visible=wallsUp||!hidden?.has(hideWhen);if(reveal&&revealWall)reveal.visible=!wallsUp&&!!hidden?.has(revealWall)}
 function setWallsUp(visible:boolean){wallsUp=visible;updateWallVisibility()}
 function setAnimationsEnabled(enabled:boolean){scene.userData.animationsEnabled=enabled}
 function setCamera(next:CameraPose,nextZoom:number,nextWidth:number,nextHeight:number){
  const target=new THREE.Vector3(w/2,h/2,d/2);const direction=view==='top'?new THREE.Vector3(0,1,0):new THREE.Vector3(Math.sin(next.azimuth)*Math.cos(next.elevation),Math.sin(next.elevation),Math.cos(next.azimuth)*Math.cos(next.elevation));camera.position.copy(target).addScaledVector(direction,30);camera.up.set(0,view==='top'?0:1,view==='top'?-1:0);camera.lookAt(target);camera.updateMatrixWorld()
  if(view==='isometric'){hidden=nearWalls(next,hidden);updateWallVisibility()}
  const inv=camera.matrixWorldInverse;const points:THREE.Vector3[]=[];for(const x of [-.1,w+.1])for(const y of [view==='top'?0:-.08,view==='top'?0:h])for(const z of [-.1,d+.1])points.push(new THREE.Vector3(x,y,z).applyMatrix4(inv));const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));const cx=(minX+maxX)/2,cy=(minY+maxY)/2,aspect=nextWidth/Math.max(nextHeight,1),fitH=Math.max((maxY-minY)*1.2,(maxX-minX)*1.2/aspect)/Math.max(.75,Math.min(3,nextZoom));camera.left=cx-fitH*aspect/2+(next.panX??0);camera.right=cx+fitH*aspect/2+(next.panX??0);camera.top=cy+fitH/2+(next.panY??0);camera.bottom=cy-fitH/2+(next.panY??0);camera.near=.01;camera.far=nightMode?180:100;camera.updateProjectionMatrix()
 }
 setCamera(pose,zoom,width,height)
 const dispose=()=>{for(const [id,obj] of objects)if(wallObjects.has(id))disposeWallModel(obj);else if(windowObjects.has(id))disposeWindowModel(obj);else if(doorObjects.has(id))disposeDoorModel(obj);else disposeFurniture(obj);scene.traverse(o=>{if(o instanceof THREE.Mesh&&!objects.has(o.userData.instanceId)&&o.geometry&&!isInsideFurniture(o,objects))o.geometry.dispose();if(o instanceof THREE.Line)o.geometry.dispose()});groundMaterial?.dispose();horizonDepthMaterial?.dispose();nightStars?.geometry.dispose();(nightStars?.material as THREE.Material|undefined)?.dispose();highlight.geometry.dispose();sun.shadow.map?.dispose();clearUnusedFurnitureGeometry()}
 return {scene,camera,objects,wallGroups,dispose,setHighlight,setCamera,setWallsUp,setAnimationsEnabled,updateProject}
}
function isInsideFurniture(o:THREE.Object3D,objects:Map<string,THREE.Group>){let p:THREE.Object3D|null=o;while(p){if([...objects.values()].includes(p as THREE.Group))return true;p=p.parent}return false}
export function createRenderer(canvas?:HTMLCanvasElement){const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;return renderer}
