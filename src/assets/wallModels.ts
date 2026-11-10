import * as THREE from 'three'
import type { Room, WallObject, WindowOpening } from '../domain/types'
import { getWallConcept, getWindowStyle } from '../catalog/wall'
import { wallAttachmentPose, type WallAttachmentGeometry } from '../geometry/wallAttachment'
import { connectBreezeAnimation, material } from './shared'

type WallModule=typeof import('./wall')
let ready:WallModule|undefined,pending:Promise<WallModule>|undefined
export async function prepareWallModels():Promise<void>{
 if(ready)return
 if(!pending)pending=import('./wall').then(m=>{ready=m;pending=undefined;return m},e=>{pending=undefined;throw e})
 await pending
}
type Part={geometry:THREE.BufferGeometry;name:string;finish:string}
type Entry={parts:Part[];refs:number}
const cache=new Map<string,Entry>(),owned=new WeakMap<THREE.Group,Entry>()
/** Builds a wall-local object for a thumbnail; origin is bottom center, front is +Z. */
export function buildWallPreview(conceptId:string,finishes:Record<string,string>):THREE.Group {
 if(!ready)throw new Error('Wall models are not prepared')
 const concept=getWallConcept(conceptId);if(!concept)throw new Error(`Unknown wall concept ${conceptId}`)
 let entry=cache.get(conceptId)
 if(!entry){const built=ready.buildWallLocal(concept);entry={parts:built.children.map(c=>{if(!(c instanceof THREE.Mesh))throw new Error('Invalid wall model');return{geometry:c.geometry,name:c.name,finish:String(c.userData.finish)}}),refs:0};cache.set(conceptId,entry)}
 entry.refs++;const group=new THREE.Group();for(const part of entry.parts){const child=new THREE.Mesh(part.geometry,material(finishes[part.name]??part.finish));child.name=part.name;child.castShadow=true;child.receiveShadow=true;group.add(child)}group.name=conceptId;owned.set(group,entry);return group
}
export function wallResourceLedger(){return {wallCachedGeometries:[...cache.values()].reduce((sum,entry)=>sum+entry.parts.length,0),wallGeometryReferences:[...cache.values()].reduce((sum,entry)=>sum+entry.refs,0)}}
export function disposeWallModel(group:THREE.Group){const bulb=group.userData.lampBulb as THREE.Mesh|undefined;if(bulb){bulb.geometry.dispose();(bulb.material as THREE.Material).dispose()}const entry=owned.get(group);if(!entry)return;owned.delete(group);if(--entry.refs===0){for(const p of entry.parts)p.geometry.dispose();for(const [key,value] of cache)if(value===entry)cache.delete(key)}}
export function applyWallAttachmentPose(group:THREE.Group,room:Room,item:WallAttachmentGeometry,id:string){
 const pose=wallAttachmentPose(room,item)
 const m=new THREE.Matrix4().makeBasis(new THREE.Vector3(pose.tangent.x,0,pose.tangent.z),new THREE.Vector3(0,1,0),new THREE.Vector3(pose.inward.x,0,pose.inward.z));m.setPosition(pose.originMm.x/1000,pose.originMm.y/1000,pose.originMm.z/1000);group.matrixAutoUpdate=false;group.matrix.copy(m);group.matrixWorldNeedsUpdate=true;group.userData.instanceId=id
}
export function applyWallObject(group:THREE.Group,room:Room,item:WallObject){
 const concept=getWallConcept(item.conceptId);if(!concept)throw new Error(`Unknown wall concept ${item.conceptId}`)
 applyWallAttachmentPose(group,room,{wall:item.wall,offsetMm:item.offsetMm,bottomMm:item.bottomMm,widthMm:concept.widthMm,heightMm:concept.heightMm,depthMm:concept.depthMm},item.id)
 group.userData.wallObject=true
 for(const c of group.children){const m=c as THREE.Mesh;if(item.finishes[m.name])m.material=material(item.finishes[m.name])}
 syncWallLamp(group,item,concept)
}
const wallLampPresets={daylight:{color:'#d8edff',intensity:7.2},white:{color:'#fff4dc',intensity:6.4},warm:{color:'#ff9b55',intensity:4.6}} as const
function syncWallLamp(group:THREE.Group,item:WallObject,concept:NonNullable<ReturnType<typeof getWallConcept>>){
 const active=concept.category==='sconce'&&(item.lampOn!==undefined||item.lampLight!==undefined||item.lampIntensity!==undefined)
 let light=group.userData.lampPointLight as THREE.PointLight|undefined,bulb=group.userData.lampBulb as THREE.Mesh|undefined
 if(!active){if(light){group.remove(light);delete group.userData.lampPointLight}if(bulb){group.remove(bulb);bulb.geometry.dispose();(bulb.material as THREE.Material).dispose();delete group.userData.lampBulb}return}
 const preset=wallLampPresets[item.lampLight??'white'],height=concept.heightMm/1000,depth=concept.depthMm/1000,centerY=height*(concept.id==='WLP-GEN-02' ? .72 : .62)
 if(!light){light=new THREE.PointLight(preset.color,0,3.6,2);light.name='Wall lamp light';light.castShadow=false;group.add(light);group.userData.lampPointLight=light}
 light.color.set(preset.color);light.intensity=item.lampOn?preset.intensity*(item.lampIntensity??75)/100:0;light.position.set(0,centerY,depth+.04)
 if(!bulb){bulb=new THREE.Mesh(new THREE.SphereGeometry(.026,12,8),new THREE.MeshBasicMaterial({color:preset.color}));bulb.name='Lamp bulb';bulb.castShadow=false;group.add(bulb);group.userData.lampBulb=bulb}
 ;(bulb.material as THREE.MeshBasicMaterial).color.set(preset.color);bulb.position.set(0,centerY,depth+.012);bulb.visible=item.lampOn===true
}
export function buildWallObject(room:Room,item:WallObject){const group=buildWallPreview(item.conceptId,item.finishes);applyWallObject(group,room,item);return group}
/** Separate from wall-mounted object count; accepts the current opening dimensions. */
export function buildWindowPreview(opening:WindowOpening):THREE.Group {if(!ready)throw new Error('Wall models are not prepared');if(opening.styleId&&!getWindowStyle(opening.styleId))throw new Error(`Unknown window style ${opening.styleId}`);const group=ready.buildWindowLocal(opening);connectBreezeAnimation(group);group.userData.breezeEnabled=false;return group}
export function disposeWindowModel(group:THREE.Group){group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()})}

export function buildWindowObject(room:Room,opening:WindowOpening){
 const group=buildWindowPreview(opening);group.name=`window:${opening.styleId??'plain'}:${opening.widthMm}:${opening.heightMm}:${opening.treatment??'none'}`;applyWindowObject(group,room,opening);return group
}
export function applyWindowObject(group:THREE.Group,room:Room,opening:WindowOpening){
 applyWallAttachmentPose(group,room,{wall:opening.wall,offsetMm:opening.offsetMm,bottomMm:opening.sillMm,widthMm:opening.widthMm,heightMm:opening.heightMm,depthMm:60},opening.id)
 group.userData.opening=true;group.userData.breezeEnabled=opening.treatment==='curtains'&&opening.breezeEnabled===true
 for(const child of group.children){if(!(child instanceof THREE.Mesh))continue;if(child.name==='Curtains')child.material=material(opening.treatmentColor?`CURTAIN:${opening.treatmentColor}`:'CURTAIN');else if(child.name==='Blinds')child.material=material(opening.treatmentColor??'BLINDS')}
}
