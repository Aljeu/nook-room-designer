import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { box, material, merge, mesh, profile, board, frustum, ringsGeometry, roundPoints, cylinder, drum, rugGeometry, rugMaterial } from './shared'

type YZ = readonly [number,number]
const outer:readonly YZ[]=[[0,-305],[0,305],[20,345],[70,385],[250,415],[430,425],[510,405],[570,345],[605,170],[620,-80],[620,-250],[595,-315],[550,-355],[320,-365],[90,-365],[30,-345]]
const hole:readonly YZ[]=[[80,-245],[80,245],[90,280],[120,315],[260,335],[400,345],[460,330],[500,285],[525,150],[540,-60],[540,-220],[525,-260],[490,-285],[320,-285],[130,-285],[95,-270]]
const stile:YZ[]=[[350,-285],[740,-410],[780,-425],[820,-395],[800,-355],[390,-205]]
const border:YZ[]=[[410,-271],[790,-394],[790,-350],[410,-227]]
const upper:YZ[]=[[750,-390],[790,-402],[810,-362],[770,-350]]
const lower:YZ[]=[[390,-275],[430,-287],[450,-247],[410,-235]]
const weave:YZ[]=[[430,-271],[770,-381],[770,-369],[430,-259]]
const meters=(p:readonly YZ[]):[number,number][]=>p.map(([y,z])=>[y/1000,z/1000])
function loop(x0:number,x1:number){
 const pos:number[]=[],norm:number[]=[],n=outer.length
 const area=outer.reduce((sum,[y,z],i)=>{const [ny,nz]=outer[(i+1)%n];return sum+y*nz-ny*z},0),sign=Math.sign(area)
 const point=(x:number,[y,z]:YZ)=>new THREE.Vector3(x,y/1000,z/1000)
 const edgeNormal=(ring:readonly YZ[],i:number,reverse:boolean)=>{const [y,z]=ring[i],[ny,nz]=ring[(i+1)%n],direction=sign*(reverse?-1:1);return new THREE.Vector3(0,direction*(nz-z),-direction*(ny-y)).normalize()}
 const normalAt=(ring:readonly YZ[],i:number,reverse:boolean)=>edgeNormal(ring,(i+n-1)%n,reverse).add(edgeNormal(ring,i,reverse)).normalize()
 const tri=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,na:THREE.Vector3,nb:THREE.Vector3,nc:THREE.Vector3,desired:THREE.Vector3)=>{
  if(b.clone().sub(a).cross(c.clone().sub(a)).dot(desired)<0){[b,c]=[c,b];[nb,nc]=[nc,nb]}
  for(const [v,nv] of [[a,na],[b,nb],[c,nc]]){pos.push(v.x,v.y,v.z);norm.push(nv.x,nv.y,nv.z)}
 }
 const quad=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,na:THREE.Vector3,nb:THREE.Vector3,nc:THREE.Vector3,nd:THREE.Vector3,desired:THREE.Vector3)=>{tri(a,b,c,na,nb,nc,desired);tri(a,c,d,na,nc,nd,desired)}
 for(let i=0;i<n;i++){
  const j=(i+1)%n
  for(const [x,nx] of [[x0,-1],[x1,1]]){const normal=new THREE.Vector3(nx,0,0);quad(point(x,outer[i]),point(x,outer[j]),point(x,hole[j]),point(x,hole[i]),normal,normal,normal,normal,normal)}
  for(const [ring,reverse] of [[outer,false],[hole,true]] as const){const ni=normalAt(ring,i,reverse),nj=normalAt(ring,j,reverse),face=edgeNormal(ring,i,reverse);quad(point(x0,ring[i]),point(x1,ring[i]),point(x1,ring[j]),point(x0,ring[j]),ni,ni,nj,nj,face)}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));return geometry
}

// Map broad faces in the authored asset frame; edges remain plain CAN.
function cane(source:THREE.BufferGeometry,axis:'xy'|'zy'|'xz',uOffset:number,vOffset:number,flat=false){
 const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();if(flat)g.computeVertexNormals()
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv:number[]=[],enabled:number[]=[]
 for(let i=0;i<p.count;i++){const u=axis==='zy'?p.getZ(i):p.getX(i),v=axis==='xz'?p.getZ(i):p.getY(i),component=axis==='xy'?n.getZ(i):axis==='zy'?n.getX(i):n.getY(i);uv.push(u*1000+uOffset,v*1000+vOffset);enabled.push(Math.abs(component)>.5?1:0)}
 g.setAttribute('caneCoordMm',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('canePatternEnabled',new THREE.Float32BufferAttribute(enabled,1));return g
}
function annulus(outer2:[number,number][],inner2:[number,number][],low:number,high:number,plane:'yz'|'xz'|'xy'){
 const p:number[]=[],n:number[]=[],count=outer2.length,make=(u:number,v:number,t:number)=>plane==='yz'?new THREE.Vector3(t,u,v):plane==='xz'?new THREE.Vector3(u,t,v):new THREE.Vector3(u,v,t)
 const axis=plane==='yz'?new THREE.Vector3(1,0,0):plane==='xz'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1)
 const center=outer2.reduce((a,[u,v])=>[a[0]+u/count,a[1]+v/count],[0,0])
 const emit=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,desired:THREE.Vector3)=>{let normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();if(normal.dot(desired)<0){[b,c]=[c,b];normal.negate()}for(const v of [a,b,c]){p.push(v.x,v.y,v.z);n.push(normal.x,normal.y,normal.z)}}
 const quad3=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,target:THREE.Vector3)=>{emit(a,b,c,target);emit(a,c,d,target)}
 for(let i=0;i<count;i++){const j=(i+1)%count,[ou,ov]=outer2[i],[pu,pv]=outer2[j],[iu,iv]=inner2[i],[ju,jv]=inner2[j]
  for(const [t,d] of [[low,-1],[high,1]])quad3(make(ou,ov,t),make(pu,pv,t),make(ju,jv,t),make(iu,iv,t),axis.clone().multiplyScalar(d))
  for(const [a,b,c,d,reverse] of [[ou,ov,pu,pv,false],[iu,iv,ju,jv,true]] as [number,number,number,number,boolean][]){const mid=make((a+c)/2,(b+d)/2,0),origin=make(center[0],center[1],0),target=mid.sub(origin).multiplyScalar(reverse?-1:1);quad3(make(a,b,low),make(a,b,high),make(c,d,high),make(c,d,low),target)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));return g
}
function caneDrum(){
 const g=drum(),p=g.getAttribute('position'),coords:number[]=[],enabled:number[]=[]
 for(let i=0;i<p.count;i++){const ringIndex=i%8,radius=ringIndex===0||ringIndex===1||ringIndex===4||ringIndex===6?.225:.221,x=p.getX(i),z=p.getZ(i),length=Math.hypot(x,z);p.setX(i,x/length*radius);p.setZ(i,z/length*radius);coords.push(Math.floor(i/8)*36,p.getY(i)*1000-1180);enabled.push(ringIndex<4?1:0)}
 g.setAttribute('caneCoordMm',new THREE.Float32BufferAttribute(coords,2));g.setAttribute('canePatternEnabled',new THREE.Float32BufferAttribute(enabled,1));return g
}
const rectangle=(w:number,h:number,cx=0,cy=0):[number,number][]=>[[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2]]
export function buildFamily(item:FurnitureInstance):THREE.Group {
 if(item.conceptId!=='CHR-FIL-01')return buildCore(item)
 const frame=[loop(-.39,-.33),loop(.33,.39),profile(-.39,-.33,meters(stile)),profile(.33,.39,meters(stile)),profile(-.33,-.3,meters(border)),profile(.3,.33,meters(border)),profile(-.33,.33,meters(upper)),profile(-.33,.33,meters(lower)),box(.66,.04,.68,0,.33,.03)]
 const group=new THREE.Group(),f=item.finishes
 group.add(mesh(box(.64,.1,.62,0,.4,.05,.025),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)),mesh(cane(profile(-.3,.3,meters(weave)),'xy',300,-430),material(f.Weave)))
 return group
}
function buildCore(item:FurnitureInstance){
 const group=new THREE.Group(),f=item.finishes
 if(item.conceptId==='SOF-FIL-01'){
  const frame:THREE.BufferGeometry[]=[];for(const x of [-.92,.92]){frame.push(box(.06,.54,.06,x,.27,.395),box(.06,.82,.06,x,.41,-.395));const arm=board(.06,.05,.85,.565);arm.translate(x,0,0);frame.push(arm,box(.06,.07,.73,x,.295,0))}for(const z of [-.395,.395])frame.push(box(1.78,.07,.06,0,.295,z));const deck=board(1.78,.03,.79,.345);deck.translate(0,0,.03);frame.push(deck);for(const y of [.795,.505]){const rail=board(1.78,.05,.06,y);rail.translate(0,0,-.395);frame.push(rail)}frame.push(box(.06,.24,.06,0,.65,-.395))
  const panels=[];for(const x of [-.46,.46])panels.push(cane(box(.86,.24,.012,x,.65,-.395),'xy',890,-530));for(const x of [-.92,.92])panels.push(cane(box(.012,.21,.73,x,.435,0),'zy',365,-330))
  group.add(mesh(merge([box(.87,.12,.69,-.445,.42,.05,.03),box(.87,.12,.69,.445,.42,.05,.03)]),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)),mesh(merge(panels,true),material(f.Weave)))
 }else if(item.conceptId==='SOF-FIL-02'){
  const frame:THREE.BufferGeometry[]=[board(1.72,.11,.70,.31),box(1.70,.06,.07,0,.245,.31),box(1.70,.07,.07,0,.29,-.36),box(1.74,.075,.11,0,1.005,-.37,.025),box(1.68,.06,.08,0,.94,-.37,.015)]
  for(const x of [-.83,.83]){
   frame.push(box(.09,.93,.10,x,.465,-.37,.025),box(.15,.15,.74,x,.60,-.015,.045),box(.14,.70,.12,x,.35,.28,.025))
  }
  for(const x of [-.52,0,.52])frame.push(box(.035,.38,.04,x,.75,-.37,.012))
  const panels=[]
  for(const x of [-.52,0,.52])panels.push(cane(box(.47,.37,.014,x,.75,-.37),'xy',Math.round(x*1000),0))
  const upholstery=[box(1.55,.18,.66,0,.405,.025,.06),box(1.48,.16,.14,0,.54,-.285,.045)]
  group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)),mesh(merge(panels,true),material(f.Weave)))
 }else if(item.conceptId==='SOF-FIL-03'){
  const upholstery:THREE.BufferGeometry[]=[],frame:THREE.BufferGeometry[]=[],panels=[]
  const centerZ=.475,seatRadius=.61,backRadius=.89,count=7,start=Math.PI/10,end=Math.PI-Math.PI/10
  const pointAt=(radius:number,angle:number,y:number)=>new THREE.Vector3(radius*Math.cos(angle),y,centerZ-radius*Math.sin(angle))
  const topRail:THREE.Vector3[]=[],lowerRail:THREE.Vector3[]=[]
  for(let index=0;index<count;index++){
   const angle=start+(end-start)*index/(count-1),yaw=angle-Math.PI/2
   const seatX=seatRadius*Math.cos(angle),seatZ=centerZ-seatRadius*Math.sin(angle)
   const cushion=box(.40,.28,.58,0,.30,0,.09);cushion.rotateY(yaw);cushion.translate(seatX,0,seatZ);upholstery.push(cushion)
   const backX=backRadius*Math.cos(angle),backZ=centerZ-backRadius*Math.sin(angle)
   const panel=cane(box(.40,.43,.014,0,.625,0),'xy',0,0);panel.rotateY(yaw);panel.translate(backX,0,backZ);panels.push(panel)
   // Keep the rattan uprights above the cushion so they support the backrest
   // without appearing to pass through the seat.
   const post=box(.045,.40,.055,0,.64,0,.015);post.rotateY(yaw);post.translate(backX,0,backZ);frame.push(post)
   topRail.push(pointAt(backRadius,angle,.84));lowerRail.push(pointAt(backRadius,angle,.43))
   if(index===0||index===3||index===6){
    for(const side of [-1,1]){
     const footX=seatX+side*.16*Math.cos(yaw),footZ=seatZ-side*.16*Math.sin(yaw)
     frame.push(frustum(footX,footZ,.15,.045,.032))
    }
   }
  }
  // The end panels extend half a panel width beyond their center posts.
  // Carry both rails to those tangent edges so they cap the entire backrest.
  for(const rail of [topRail,lowerRail]){
   const first=rail[0],last=rail[rail.length-1]
   rail.unshift(new THREE.Vector3(first.x+.20*Math.sin(start),first.y,first.z+.20*Math.cos(start)))
   rail.push(new THREE.Vector3(last.x-.20*Math.sin(end),last.y,last.z-.20*Math.cos(end)))
  }
  frame.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(topRail),56,.026,8,false),new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lowerRail),56,.023,8,false))
  const seatRail=[]
  for(let index=0;index<=24;index++){
   const angle=start+(end-start)*index/24
   seatRail.push(pointAt(seatRadius,angle,.15))
  }
  frame.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seatRail),40,.025,8,false))
  group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)),mesh(merge(panels,true),material(f.Weave)))
 }else if(item.conceptId==='CFT-FIL-01'){
  const top=ringsGeometry([{y:.36,points:roundPoints(1.094,.594,.042,4)},{y:.363,points:roundPoints(1.1,.6,.045,4)},{y:.397,points:roundPoints(1.1,.6,.045,4)},{y:.4,points:roundPoints(1.094,.594,.042,4)}])
  const out:[number,number][]=[[0,-.21],[0,.21],[.03,.24],[.33,.24],[.36,.21],[.36,-.21],[.33,-.24],[.03,-.24]],hole:[number,number][]=[[.07,-.15],[.07,.15],[.09,.17],[.28,.17],[.3,.15],[.3,-.15],[.28,-.17],[.09,-.17]]
  const frame=[annulus(out,hole,-.46,-.38,'yz'),annulus(out,hole,.38,.46,'yz'),box(.84,.05,.06,0,.045,0),box(.01,.03,.07,-.465,.045,0),box(.01,.03,.07,.465,.045,0)]
  group.add(mesh(top,material(f.Top)),mesh(merge(frame),material(f.Frame)))
 }else if(item.conceptId==='SFT-FIL-01'){
  const frame=[annulus(roundPoints(.45,.45,.03,4),roundPoints(.33,.33,.012,4),.49,.52,'xz'),box(.354,.012,.354,0,.502,0)]
  for(const x of [-.17,.17])for(const z of [-.17,.17])frame.push(frustum(x,z,.49,.044,.032));for(const z of [-.17,.17])frame.push(box(.296,.03,.022,0,.46,z));for(const x of [-.17,.17])frame.push(box(.022,.03,.296,x,.46,0))
  const points=roundPoints(.33,.33,.012,4),inset=cane(ringsGeometry([{y:.508,points},{y:.52,points}]),'xz',165,165,true)
  group.add(mesh(merge(frame),material(f.Frame)),mesh(inset,material(f.Weave)))
 }else if(item.conceptId==='MED-FIL-01'){
  const body=[board(1.6,.02,.42,.49),board(1.6,.02,.42,.14),box(.02,.33,.42,-.79,.315,0),box(.02,.33,.42,.79,.315,0),box(1.56,.33,.016,0,.315,-.202),box(.02,.33,.388,-.25,.315,0),box(.02,.33,.388,.25,.315,0)]
  const frame=[];for(const x of [-.52,.52])frame.push(annulus(rectangle(.516,.326,x,.315),rectangle(.428,.238,x,.315),.19,.21,'xy'));for(const x of [-.7,.7])for(const z of [-.15,.15])frame.push(box(.03,.13,.03,x,.065,z))
  const panels=[cane(box(.428,.238,.012,-.52,.315,.2),'xy',734,-196),cane(box(.428,.238,.012,.52,.315,.2),'xy',734,-196)]
  group.add(mesh(merge(body),material(f.Body)),mesh(merge(frame),material(f.Frame)),mesh(merge(panels,true),material(f.Weave)))
 }else if(item.conceptId==='BKC-FIL-01'){
  const body=[box(.024,1.6,.34,-.388,.8,0),box(.024,1.6,.34,.388,.8,0),board(.752,.024,.34,1.588),board(.752,.024,.34,.012),box(.752,.812,.012,0,.8,-.164)];for(const y of [.406,.8,1.194]){const shelf=board(.752,.024,.328,y);shelf.translate(0,0,.006);body.push(shelf)}
  const panels=[cane(box(.752,.37,.012,0,.209,-.164),'xy',376,-24),cane(box(.752,.37,.012,0,1.391,-.164),'xy',376,-24)]
  group.add(mesh(merge(body),material(f.Body)),mesh(merge(panels,true),material(f.Weave)))
 }else if(item.conceptId==='RUG-FIL-01'){
  const rug=mesh(rugGeometry(2.3,1.6,2,f.TextileGround,f.TextileMotif),rugMaterial());rug.castShadow=false;group.add(rug)
 }else if(item.conceptId==='LMP-FIL-01'){
  const frame=[cylinder(.15,.03,40,.015),cylinder(.014,1.23,16,.645)],metal=[cylinder(.018,.04,12,1.26),box(.442,.006,.006,0,1.27,0),box(.006,.006,.442,0,1.27,0)]
  group.add(mesh(merge(frame),material(f.Frame)),mesh(merge(metal),material(f.Metalwork)),mesh(caneDrum(),material(f.Weave)))
 }else throw new Error(`Unknown Filipino model ${item.conceptId}`)
 return group
}
