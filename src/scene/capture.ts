import * as THREE from 'three'
import type { Project } from '../domain/types'
import { prepareFurniture } from '../assets/models'
import { prepareWallModels } from '../assets/wallModels'
import { prepareDoorModels } from '../assets/doorModels'
import { canonicalPose, type CameraPose } from './camera'
import { createRenderer, createWorld } from './world'
import { drawNookBrand, prepareNookBrand } from '../exports/branding'

export type ExportView = 'isometric' | 'top' | 'top-3d' | 'front' | 'side-left' | 'side-right'
const poses: Record<Exclude<ExportView, 'top'>, CameraPose> = {
 isometric: canonicalPose(), 'top-3d': { azimuth: Math.PI / 4, elevation: Math.PI / 2 - .0001 }, front: { azimuth: 0, elevation: 0 },
 'side-left': { azimuth: -Math.PI / 2, elevation: 0 }, 'side-right': { azimuth: Math.PI / 2, elevation: 0 },
}
async function prepare(project: Project) {
 await Promise.all([prepareFurniture(project.instances.map(item=>item.conceptId)), ...(project.wallObjects?.length || project.room.openings.some(o=>o.type==='window') ? [prepareWallModels()] : []), ...(project.room.openings.some(o=>o.type==='door'||o.type==='archway') ? [prepareDoorModels()] : [])])
}
function drawDimensions(ctx: CanvasRenderingContext2D, camera: THREE.Camera, project: Project, width: number, height: number, view: ExportView) {
 const {widthMm,depthMm,heightMm}=project.room, w=widthMm/1000,d=depthMm/1000,h=heightMm/1000, gap=Math.max(w,d)*.06+.1
 const point=(x:number,y:number,z:number)=>{const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2}}
 const line=(a:THREE.Vector3,b:THREE.Vector3,label:string,offsetX=0)=>{const p=point(a.x,a.y,a.z),q=point(b.x,b.y,b.z);p.x+=offsetX;q.x+=offsetX;const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<12)return;const nx=-dy/len,ny=dx/len;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.moveTo(p.x-nx*6,p.y-ny*6);ctx.lineTo(p.x+nx*6,p.y+ny*6);ctx.moveTo(q.x-nx*6,q.y-ny*6);ctx.lineTo(q.x+nx*6,q.y+ny*6);ctx.stroke();ctx.save();ctx.translate((p.x+q.x)/2,(p.y+q.y)/2);let angle=Math.atan2(dy,dx);if(angle>Math.PI/2||angle< -Math.PI/2)angle+=Math.PI;ctx.rotate(angle);ctx.fillStyle='#fafaf7';const tw=ctx.measureText(label).width;ctx.fillRect(-tw/2-5,-15,tw+10,19);ctx.fillStyle='#24302b';ctx.fillText(label,0,0);ctx.restore()}
 ctx.save();ctx.strokeStyle='#33463c';ctx.lineWidth=2;ctx.font='500 18px Creato, Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';line(new THREE.Vector3(0,0,d+gap),new THREE.Vector3(w,0,d+gap),`${w} m`);line(new THREE.Vector3(w+gap,0,0),new THREE.Vector3(w+gap,0,d),`${d} m`);if(view!=='top'){const corners=[[0,0],[0,d],[w,0],[w,d]];const [x,z]=corners.reduce((best,current)=>point(current[0],0,current[1]).x>point(best[0],0,best[1]).x?current:best);line(new THREE.Vector3(x,0,z),new THREE.Vector3(x,h,z),`${h} m`,24)}ctx.restore()
}
export async function captureRoomPng(project:Project,width:number,height:number,view:ExportView='isometric',dimensions=false,options:{animationsEnabled?:boolean;nightMode?:boolean}={}):Promise<Blob>{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Invalid image dimensions')
 await prepareNookBrand()
 await prepare(project)
 const renderer=createRenderer();let world:ReturnType<typeof createWorld>|undefined
 try {renderer.setSize(width,height,false);world=createWorld(project,view==='top'?'top':'isometric',dimensions ? .8 : 1,width,height,null,view==='top'?canonicalPose():poses[view],false,false,options.animationsEnabled!==false,!!options.nightMode);renderer.render(world.scene,world.camera);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image export is unavailable.');ctx.drawImage(renderer.domElement,0,0);if(dimensions)drawDimensions(ctx,world.camera,project,width,height,view);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG capture failed')),'image/png'))} finally {world?.dispose();renderer.dispose();renderer.forceContextLoss()}
}
export async function captureRoomVideo(project:Project,view:ExportView,duration:5|10,options:{animationsEnabled?:boolean;nightMode?:boolean;quality?:'low'|'high'}={}):Promise<{blob:Blob;extension:string}>{
 if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)throw new Error('Video export is not supported in this browser.')
 const mime=['video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw new Error('No supported video format is available in this browser.')
 const brandMark=await prepareNookBrand();await prepare(project)
 const quality=options.quality??'low',width=quality==='high'?1920:1280,height=quality==='high'?1080:720,videoBitsPerSecond=quality==='high'?12000000:6000000,renderer=createRenderer();let world:ReturnType<typeof createWorld>|undefined;let stream:MediaStream|undefined;let raf=0
 try {
  renderer.setSize(width,height,false);const base=view==='top'?canonicalPose():poses[view];world=createWorld(project,view==='top'?'top':'isometric',.8,width,height,null,base,false,false,options.animationsEnabled!==false,!!options.nightMode);renderer.render(world.scene,world.camera)
  const output=document.createElement('canvas');output.width=width;output.height=height;const ctx=output.getContext('2d');if(!ctx)throw new Error('Video export is unavailable.')
  const drawFrame=()=>{renderer.render(world!.scene,world!.camera);ctx.drawImage(renderer.domElement,0,0);drawNookBrand(ctx,width,height,brandMark)}
  drawFrame();stream=output.captureStream(30);const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond});const chunks:Blob[]=[]
  const recorded=new Promise<Blob>((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=()=>reject(new Error('Video recording failed.'));recorder.onstop=()=>chunks.length?resolve(new Blob(chunks,{type:mime})):reject(new Error('Video recording produced no frames.'))})
  recorder.start();const start=performance.now();await new Promise<void>(resolve=>{const frame=(now:number)=>{const elapsed=Math.min((now-start)/1000,duration);drawFrame();if(elapsed<duration)raf=requestAnimationFrame(frame);else resolve()};raf=requestAnimationFrame(frame)});recorder.stop();return {blob:await recorded,extension:mime.startsWith('video/mp4')?'mp4':'webm'}
 } finally {cancelAnimationFrame(raf);stream?.getTracks().forEach(track=>track.stop());world?.dispose();renderer.dispose();renderer.forceContextLoss()}
}
