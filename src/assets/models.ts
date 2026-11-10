import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { allocatedFurnitureMaterialCount, connectBreezeAnimation, material, rugMaterial } from './shared'

type Family = 'SCA' | 'MCM' | 'FIL' | 'PLT' | 'APP' | 'NSD' | 'ELC'
type FamilyModule = { buildFamily:(item:FurnitureInstance)=>THREE.Group }
type Loader = () => Promise<FamilyModule>
type LoaderMap = Partial<Record<Family,Loader>>
const loaders:Record<Family,Loader>={SCA:()=>import('./sca'),MCM:()=>import('./mcm'),FIL:()=>import('./fil'),PLT:()=>import('./plants'),APP:()=>import('./appliances'),NSD:()=>import('./nightstands'),ELC:()=>import('./electronics')}
const regions:Record<string,string[]>={
 'CHR-FIL-01':['Upholstery','Frame','Weave'],'SOF-FIL-01':['Upholstery','Frame','Weave'],'SOF-FIL-02':['Upholstery','Frame','Weave'],'SOF-FIL-03':['Upholstery','Frame','Weave'],'CFT-FIL-01':['Top','Frame'],'SFT-FIL-01':['Frame','Weave'],'MED-FIL-01':['Body','Frame','Weave'],'BKC-FIL-01':['Body','Weave'],'RUG-FIL-01':['Textile'],'LMP-FIL-01':['Frame','Metalwork','Weave'],
 'SOF-SCA-01':['Upholstery','Frame'],'SOF-SCA-02':['Upholstery','Frame'],'SOF-SCA-03':['Upholstery','Frame'],'CFT-SCA-01':['Top','Frame'],'RUG-SCA-01':['Textile'],'CHR-SCA-01':['Upholstery','Frame'],'SFT-SCA-01':['Top','Frame'],'MED-SCA-01':['Body','Fronts','Frame'],'BKC-SCA-01':['Body'],'LMP-SCA-01':['Metalwork','Shade'],
 'SOF-MCM-01':['Upholstery','Frame'],'SOF-MCM-02':['Upholstery','Frame'],'SOF-MCM-03':['Upholstery','Frame'],'SOF-MCM-04':['Upholstery','Frame'],'CHR-MCM-01':['Upholstery','Frame'],'CFT-MCM-01':['Top','Frame'],'SFT-MCM-01':['Top','Frame'],'MED-MCM-01':['Body','Fronts','Frame'],'BKC-MCM-01':['Body','Frame'],'RUG-MCM-01':['Textile'],'RUG-MCM-02':['Textile'],'RUG-MCM-03':['Textile'],'RUG-MCM-04':['Textile'],'RUG-MCM-05':['Textile'],'LMP-MCM-01':['Frame','Metalwork','Shade'],
 'PLT-PLT-01':['Leaves','Leaf accents','Trunk','Planter','Soil'],'PLT-PLT-02':['Fronds','Frond accents','Trunk','Planter','Soil'],'PLT-PLT-03':['Leaves','Leaf accents','Trunk','Planter','Soil','Stand'],
 'VNT-APP-01':['Shell','Grille','Display','Indicator'],'VNT-APP-02':['Shell','Grille','Blade','Indicator'],
 'NST-NSD-01':['Body','Fronts','Frame','Hardware'],'NST-NSD-02':['Body','Fronts','Frame','Hardware'],'NST-NSD-03':['Body','Fronts','Frame','Weave','Hardware'],'NST-NSD-04':['Body','Fronts','Frame','Hardware'],
 'ELC-ELC-01':['Frame','Screen','Stand'],'ELC-ELC-02':['Body','Body','Screen','Keyboard','Trackpad'],
}
export function createFamilyPreparer(source:LoaderMap) {
 const ready=new Map<Family,FamilyModule>(), pending=new Map<Family,Promise<FamilyModule>>()
 function prepare(family:Family):Promise<FamilyModule>{
  const loaded=ready.get(family);if(loaded)return Promise.resolve(loaded)
  const current=pending.get(family);if(current)return current
  const loader=source[family]
  if(!loader)return Promise.reject(new Error(`No furniture loader for ${family}`))
  const request=Promise.resolve().then(loader).then(module=>{ready.set(family,module);pending.delete(family);return module},error=>{pending.delete(family);throw error})
  pending.set(family,request);return request
 }
 return {prepare,get:(family:Family)=>ready.get(family)}
}
const families=createFamilyPreparer(loaders)
function familyOf(id:string):Family {const family=id.split('-')[1];if((family==='SCA'||family==='MCM'||family==='FIL'||family==='PLT'||family==='APP'||family==='NSD'||family==='ELC')&&regions[id])return family;throw new Error(`No furniture model for ${id}`)}
export async function prepareFurniture(ids:readonly string[]):Promise<void>{await Promise.all([...new Set(ids.map(familyOf))].map(families.prepare))}

type Part={geometry:THREE.BufferGeometry;name:string;cast:boolean;receive:boolean}
type Entry={parts:Part[];refs:number;used:number}
const cache=new Map<string,Entry>(), owned=new WeakMap<THREE.Object3D,Entry>()
let tick=0
const MAX_IDLE_CACHE=32
const ownedKeys=new WeakMap<THREE.Object3D,string>()
function keyFor(item:FurnitureInstance){return item.conceptId.startsWith('RUG-')?`${item.conceptId}:${item.finishes.TextileGround}:${item.finishes.TextileMotif}`:item.conceptId}
function trimCache(){while(cache.size>MAX_IDLE_CACHE){const candidate=[...cache.entries()].filter(([,e])=>e.refs===0).sort((a,b)=>a[1].used-b[1].used)[0];if(!candidate)break;cache.delete(candidate[0]);candidate[1].parts.forEach(p=>p.geometry.dispose())}}
export function clearUnusedFurnitureGeometry(){for(const [key,entry] of cache)if(!entry.refs){cache.delete(key);entry.parts.forEach(p=>p.geometry.dispose())}}
export function furnitureResourceLedger(){return {cachedGeometryEntries:cache.size,cachedGeometries:[...cache.values()].reduce((n,e)=>n+e.parts.length,0),geometryReferences:[...cache.values()].reduce((n,e)=>n+e.refs,0),allocatedFurnitureMaterials:allocatedFurnitureMaterialCount(),idleCacheLimit:MAX_IDLE_CACHE}}
export function buildFurniture(item:FurnitureInstance):THREE.Group {
 const family=familyOf(item.conceptId),module=families.get(family);if(!module)throw new Error(`Furniture family ${family} is not prepared`)
 const key=keyFor(item);let entry=cache.get(key)
 if(!entry){const built=module.buildFamily(item),names=regions[item.conceptId];entry={parts:built.children.map((child,i)=>{if(!(child instanceof THREE.Mesh))throw new Error(`Unexpected furniture part in ${item.conceptId}`);return {geometry:child.geometry,name:names[i],cast:child.castShadow,receive:child.receiveShadow}}),refs:0,used:++tick};cache.set(key,entry)}
 entry.refs++;entry.used=++tick;const group=new THREE.Group();for(const part of entry.parts){const m=new THREE.Mesh(part.geometry,part.name==='Textile'?rugMaterial():material(item.finishes[part.name]));m.name=part.name;m.castShadow=part.cast;m.receiveShadow=part.receive;group.add(m)}
 group.name=item.conceptId;group.userData.instanceId=item.id;owned.set(group,entry);ownedKeys.set(group,key);connectBreezeAnimation(group);applyFurnitureTransform(group,item);trimCache();return group
}
export function updateFurniture(group:THREE.Group,item:FurnitureInstance){
 const key=keyFor(item)
 if(ownedKeys.get(group)!==key){
  const replacement=buildFurniture(item),old=owned.get(group),next=owned.get(replacement)!,oldBulb=group.userData.lampBulb as THREE.Mesh|undefined
  const replacementLight=replacement.userData.lampPointLight as THREE.PointLight|undefined,replacementBulb=replacement.userData.lampBulb as THREE.Mesh|undefined
  if(oldBulb){oldBulb.geometry.dispose();(oldBulb.material as THREE.Material).dispose()}
  delete group.userData.lampPointLight;delete group.userData.lampBulb
  owned.delete(replacement);ownedKeys.delete(replacement);if(old){old.refs--;old.used=++tick}
  group.clear();group.add(...[...replacement.children]);if(replacementLight)group.userData.lampPointLight=replacementLight;else delete group.userData.lampPointLight;if(replacementBulb)group.userData.lampBulb=replacementBulb;else delete group.userData.lampBulb;owned.set(group,next);ownedKeys.set(group,key);group.name=item.conceptId;trimCache()
 }
 applyFurnitureTransform(group,item);updateFurnitureMaterials(group,item)
}
const lampPresets={daylight:{color:'#d8edff',intensity:7.2},white:{color:'#fff4dc',intensity:6.4},warm:{color:'#ff9b55',intensity:4.6}} as const
function syncLampLight(group:THREE.Group,item:FurnitureInstance){
 const isLamp=item.conceptId.startsWith('LMP-'),hasLampState=item.lampOn!==undefined||item.lampLight!==undefined
 let light=group.userData.lampPointLight as THREE.PointLight|undefined,bulb=group.userData.lampBulb as THREE.Mesh|undefined
 if(!isLamp||!hasLampState){if(light){group.remove(light);delete group.userData.lampPointLight}if(bulb){group.remove(bulb);bulb.geometry.dispose();(bulb.material as THREE.Material).dispose();delete group.userData.lampBulb}return}
 const bounds=new THREE.Box3();for(const child of group.children){if(!(child instanceof THREE.Mesh))continue;child.geometry.computeBoundingBox();if(child.geometry.boundingBox)bounds.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrix))}
 const top=Number.isFinite(bounds.max.y)?bounds.max.y:1.5,preset=lampPresets[item.lampLight??'white']
 if(!light){light=new THREE.PointLight(preset.color,0,3.8,2);light.name='Lamp light';light.castShadow=false;group.add(light);group.userData.lampPointLight=light}
 light.color.set(preset.color);light.intensity=item.lampOn?preset.intensity*(item.lampIntensity??75)/100:0;light.position.set(0,top-.11,0)
 if(!bulb){bulb=new THREE.Mesh(new THREE.SphereGeometry(.034,12,8),new THREE.MeshBasicMaterial({color:preset.color}));bulb.name='Lamp bulb';bulb.castShadow=false;group.add(bulb);group.userData.lampBulb=bulb}
 ;(bulb.material as THREE.MeshBasicMaterial).color.set(preset.color);bulb.position.set(0,top-.21,0);bulb.visible=item.lampOn===true
}
export function applyFurnitureTransform(group:THREE.Group,item:FurnitureInstance){group.position.set(item.centerXMm/1000,(item.elevationMm??0)/1000,item.centerZMm/1000);group.rotation.y=-(item.rotationDegrees??item.quarterTurn*90)*Math.PI/180;group.scale.set(item.flipHorizontal?-1:1,1,item.flipVertical?-1:1);group.userData.breezeEnabled=item.conceptId.startsWith('PLT-')&&item.breezeEnabled===true;syncLampLight(group,item)}
export function updateFurnitureMaterials(group:THREE.Group,item:FurnitureInstance){for(const child of group.children)if(child instanceof THREE.Mesh&&child.name!=='Textile'&&child.name!=='Lamp bulb')child.material=material(item.finishes[child.name])}
export function disposeFurniture(group:THREE.Object3D){const lampBulb=group.userData.lampBulb as THREE.Mesh|undefined;if(lampBulb){lampBulb.geometry.dispose();(lampBulb.material as THREE.Material).dispose()}const entry=owned.get(group);if(!entry)return;owned.delete(group);ownedKeys.delete(group);entry.refs--;entry.used=++tick;trimCache()}
