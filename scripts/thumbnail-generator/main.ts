import * as THREE from 'three'
import { getAvailableConcepts, defaultFinishes } from '../../src/catalog'
import { WALL_CONCEPTS, WINDOW_STYLES } from '../../src/catalog/wall'
import { DOOR_STYLES } from '../../src/catalog/doors'
import { buildFurniture, disposeFurniture, prepareFurniture } from '../../src/assets/models'
import { buildWallPreview, buildWindowPreview, disposeWallModel, disposeWindowModel, prepareWallModels } from '../../src/assets/wallModels'
import { buildDoorPreview, disposeDoorModel, prepareDoorModels } from '../../src/assets/doorModels'
import { furnitureThumbnailKey, wallThumbnailKey, windowThumbnailKey, doorThumbnailKey } from '../../src/ui/thumbnailKeys'

const button = document.querySelector<HTMLButtonElement>('#start')!
const status = document.querySelector<HTMLElement>('#status')!
const items = [
 ...getAvailableConcepts().map(concept => ({kind:'furniture' as const,id:concept.id,key:furnitureThumbnailKey(concept),concept})),
 ...WALL_CONCEPTS.map(concept => ({kind:'wall' as const,id:concept.id,key:wallThumbnailKey(concept),concept})),
 ...WINDOW_STYLES.map(style => ({kind:'window' as const,id:style.id,key:windowThumbnailKey(style),style})),
 ...DOOR_STYLES.map(style => ({kind:'door' as const,id:style.id,key:doorThumbnailKey(style),style})),
]
type Item = typeof items[number]
async function makeImage(item: Item): Promise<Blob> {
 if(item.kind==='furniture') await prepareFurniture([item.id])
 else if(item.kind==='door') await prepareDoorModels()
 else await prepareWallModels()
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true})
 let object:THREE.Group|undefined
 try {
  const size=item.kind==='furniture'?320:160
  renderer.setSize(size,size);renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace
  const scene=new THREE.Scene();scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(4,8,6);scene.add(light)
  if(item.kind==='furniture')object=buildFurniture({id:'preview',conceptId:item.id,centerXMm:0,centerZMm:0,quarterTurn:0,finishes:defaultFinishes(item.concept)})
  else if(item.kind==='wall')object=buildWallPreview(item.id,{...item.concept.defaults})
  else if(item.kind==='window')object=buildWindowPreview({id:'preview',type:'window',wall:'N',offsetMm:0,widthMm:item.style.widthMm,heightMm:item.style.heightMm,sillMm:item.style.sillMm,styleId:item.id})
  else object=buildDoorPreview(item.style,item.style.widthMm,item.style.heightMm,{includeWallFill:false})
  scene.add(object)
  const bounds=new THREE.Box3().setFromObject(object),center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius,.2),extent=radius*(item.kind==='furniture'?1.1:1.2)
  const camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,.01,radius*20+10)
  const direction=item.kind==='furniture'?new THREE.Vector3(4,item.concept.category==='RUG'?7:3,5):item.kind==='door'?new THREE.Vector3(2,1.7,5):new THREE.Vector3(2,1,5)
  camera.position.copy(center).add(direction.normalize().multiplyScalar(radius*5+2));camera.lookAt(center);renderer.render(scene,camera)
  return await new Promise<Blob>((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'))
 } finally {
  try {if(object){if(item.kind==='furniture')disposeFurniture(object);else if(item.kind==='wall')disposeWallModel(object);else if(item.kind==='window')disposeWindowModel(object);else disposeDoorModel(object)}} finally {try{renderer.dispose()}finally{renderer.forceContextLoss()}}
 }
}
button.addEventListener('click',async()=>{
 button.disabled=true
 try {
  for(let i=0;i<items.length;i++){
   const item=items[i];status.textContent=`Preparing ${i+1} of ${items.length}: ${item.id}`
   const blob=await makeImage(item)
   const response=await fetch(`/__nook_thumbnail/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.id)}`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob})
   if(!response.ok)throw new Error(`Could not save ${item.id}: ${await response.text()}`)
  }
  const response=await fetch('/__nook_thumbnail_complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(items.map(({kind,id,key})=>({kind,id,key})))})
  if(!response.ok)throw new Error(await response.text())
  status.textContent=`Completed ${items.length} catalog previews.`
 } catch(error) {status.textContent=`Preparation failed: ${error instanceof Error?error.message:String(error)}`;button.disabled=false}
})
