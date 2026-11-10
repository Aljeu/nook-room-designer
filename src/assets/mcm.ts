import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { merge, box, frustum, ringsGeometry, board, cylinder, loft, splay, circlePoints, slabPolygon, gridVolume, coneShade, mesh, rugMaterial, rugGeometry, material, tuftedSeat } from './shared'
import { KIDNEY_CONTOUR } from '../catalog/mcm'
export function buildFamily(item:FurnitureInstance):THREE.Group { const group=new THREE.Group(),f=item.finishes
if(item.conceptId==='SOF-MCM-01') {
   const up=[board(2.1,.14,.86,.23),box(.08,.22,.86,-1.01,.41,0,.018),box(.08,.22,.86,1.01,.41,0,.018),box(1.94,.48,.1,0,.54,-.38,.025),...[-.65,0,.65].map(tuftedSeat)];const legs=[];for(const x of [-1,1])for(const z of [-1,1])legs.push(splay(x*.97,z*.35,x*.88,z*.28,.16,.04,.07));group.add(mesh(merge(up),material(f.Upholstery)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='SOF-MCM-02') {
   const upholstery:THREE.BufferGeometry[]=[box(2.48,.16,.86,0,.17,-.03,.07),box(2.48,.10,.16,0,.22,-.39,.06)]
   const centers=[-.93,-.31,.31,.93]
   for(const x of centers){
    upholstery.push(box(.58,.31,.76,x,.34,.03,.12),box(.58,.48,.20,x,.64,-.37,.11))
   }
   upholstery.push(box(.26,.66,.92,-1.18,.39,-.02,.12),box(.26,.66,.92,1.18,.39,-.02,.12))
   const legs=[]
   for(const x of [-1,1])for(const z of [-.34,.31])legs.push(splay(x*1.08,z,x*1.03,z-.025,.10,.045,.055))
   group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='SOF-MCM-03') {
   const upholstery:THREE.BufferGeometry[]=[],frame:THREE.BufferGeometry[]=[]
   const centerZ=.525,seatRadius=.70,backRadius=.95,segments=7,start=Math.PI/9,end=Math.PI-Math.PI/9
   const pathAt=(radius:number,angle:number,y:number)=>new THREE.Vector3(radius*Math.cos(angle),y,centerZ-radius*Math.sin(angle))
   for(let index=0;index<segments;index++){
    const angle=start+(end-start)*index/(segments-1),yaw=angle-Math.PI/2
    const seatX=seatRadius*Math.cos(angle),seatZ=centerZ-seatRadius*Math.sin(angle)
    const seat=box(.54,.28,.72,0,.28,0,.09);seat.rotateY(yaw);seat.translate(seatX,0,seatZ);upholstery.push(seat)
    const backX=backRadius*Math.cos(angle),backZ=centerZ-backRadius*Math.sin(angle)
    const back=box(.54,.48,.20,0,.60,0,.08);back.rotateY(yaw);back.translate(backX,0,backZ);upholstery.push(back)
    if(index%2===0)for(const side of [-1,1]){
     const footX=seatX+side*.19*Math.cos(yaw),footZ=seatZ-side*.19*Math.sin(yaw)
     frame.push(frustum(footX,footZ,.13,.045,.035))
    }
   }
   const outer=[],inner=[]
   for(let index=0;index<=24;index++){
    const angle=start+(end-start)*index/24
    outer.push(pathAt(1.03,angle,.40));inner.push(pathAt(.72,angle,.14))
   }
   frame.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer),48,.026,8,false),new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner),48,.022,8,false))
   group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)))
  }
else if(item.conceptId==='SOF-MCM-04') {
   const frame:THREE.BufferGeometry[]=[box(1.78,.11,.78,0,.25,0,.035),box(.22,.78,.86,-.90,.39,0,.07),box(.22,.78,.86,.90,.39,0,.07),box(1.66,.10,.10,0,.48,-.36,.025),box(1.66,.08,.10,0,.77,-.36,.025)]
   for(const x of [-.68,-.23,.23,.68])frame.push(box(.09,.36,.075,x,.61,-.36,.018))
   const upholstery=[box(1.62,.20,.66,0,.37,.045,.09),box(1.60,.28,.14,0,.60,-.29,.06)]
   const feet=[];for(const x of [-1,1])for(const z of [-1,1])feet.push(box(.14,.08,.14,x*.83,.04,z*.34,.02))
   group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge([...frame,...feet]),material(f.Frame)))
  }
else if(item.conceptId==='CHR-MCM-01') {
   const xs=[-.39,-.3,-.15,0,.15,.3,.39],e=[.02,.012,.004,0,.004,.012,.02],shift=[-.02,-.012,-.004,0,-.004,-.012,-.02],rows=[[.35,.43,0],[.32,.33,0],[.3,.05,0],[.36,-.19,0],[.56,-.3,.5],[.78,-.41,1]]
   const shell=rows.flatMap(([y,z,k])=>xs.map((x,i)=>new THREE.Vector3(x,y+e[i],z+shift[i]*k))),shellLower=shell.map(v=>v.clone().add(new THREE.Vector3(0,-.018,0)))
   const padXs=[-.3,-.15,0,.15,.3],padE=[.012,.004,0,.004,.012],padF=[-.012,-.004,0,-.004,-.012]
   const seatRows=[[.32,.33],[.3,.05],[.36,-.19]],seat=seatRows.flatMap(([y,z])=>padXs.map((x,i)=>new THREE.Vector3(x,y+padE[i]+.035,z))),seatBottom=seat.map(v=>v.clone().add(new THREE.Vector3(0,-.034,0)))
   const backRows=[[.38,-.201,0],[.56,-.3,.5],[.73,-.385,1]],back=backRows.flatMap(([y,z,k])=>padXs.map((x,i)=>new THREE.Vector3(x,y+padE[i],z+padF[i]*k+.031))),backRear=back.map(v=>v.clone().add(new THREE.Vector3(0,0,-.03)))
   const frame=[gridVolume(shell,shellLower,7,6),box(.62,.04,.54,0,.28,.08)];for(const x of [-1,1])for(const z of [-1,1])frame.push(splay(x*.31,z*.3,x*.24,z*.14,.28,.04,.06));group.add(mesh(merge([gridVolume(seat,seatBottom,5,3),gridVolume(back,backRear,5,3)]),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)))
  }
else if(item.conceptId==='CFT-MCM-01') {
   const legs=[splay(-.42,-.15,-.36,-.12,.36,.035,.06),splay(.39,-.02,.34,-.02,.36,.035,.06),splay(.16,.23,.14,.19,.36,.035,.06)];group.add(mesh(slabPolygon(KIDNEY_CONTOUR,.36,.4),material(f.Top)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='SFT-MCM-01') {
   const top=ringsGeometry([{y:.48,points:circlePoints(.227,40)},{y:.483,points:circlePoints(.23,40)},{y:.507,points:circlePoints(.23,40)},{y:.51,points:circlePoints(.227,40)}]);const legs=[loft(circlePoints(.011,12,0,-.18),circlePoints(.018,12,0,-.13),.48),loft(circlePoints(.011,12,.156,.09),circlePoints(.018,12,.113,.065),.48),loft(circlePoints(.011,12,-.156,.09),circlePoints(.018,12,-.113,.065),.48)];group.add(mesh(top,material(f.Top)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='MED-MCM-01') {
   const body=[board(1.7,.02,.42,.54),board(1.7,.02,.42,.18),box(.02,.34,.42,-.84,.36,0),box(.02,.34,.42,.84,.36,0),box(1.66,.34,.016,0,.36,-.202),box(.02,.34,.378,0,.36,-.005)],fronts=[box(.88,.332,.01,-.39,.36,.205,.002),box(.88,.332,.01,.39,.36,.191,.002)],legs=[];for(const x of [-1,1])for(const z of [-1,1])legs.push(splay(x*.76,z*.155,x*.7,z*.13,.17,.03,.05));group.add(mesh(merge(body),material(f.Body)),mesh(merge(fronts),material(f.Fronts)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='BKC-MCM-01') {
   const body=[board(.9,.024,.34,1.538),board(.9,.024,.34,.192),box(.024,1.322,.34,-.438,.865,0),box(.024,1.322,.34,.438,.865,0),box(.852,1.322,.012,0,.865,-.164),box(.024,1.322,.328,-.11,.865,.006)];for(const y of [.644,1.084]){const g=board(.304,.024,.328,y);g.translate(-.274,0,.006);body.push(g)}const shelf=board(.524,.024,.328,.844);shelf.translate(.164,0,.006);body.push(shelf);const legs=[];for(const x of [-1,1])for(const z of [-1,1])legs.push(splay(x*.405,z*.13,x*.34,z*.095,.18,.03,.05));group.add(mesh(merge(body),material(f.Body)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='RUG-MCM-01') {
   const rug=mesh(rugGeometry(2.3,1.6,1,f.TextileGround,f.TextileMotif),rugMaterial());rug.castShadow=false;group.add(rug)
  }
else if(item.conceptId==='RUG-MCM-02') {
   const rug=mesh(rugGeometry(2.1,2.1,3,f.TextileGround,f.TextileMotif,'circle'),rugMaterial());rug.castShadow=false;group.add(rug)
  }
else if(item.conceptId==='RUG-MCM-03') {
   const rug=mesh(rugGeometry(2.3,1.8,4,f.TextileGround,f.TextileMotif,'organic'),rugMaterial());rug.castShadow=false;group.add(rug)
  }
else if(item.conceptId==='RUG-MCM-04') {
   const rug=mesh(rugGeometry(2,2,5,f.TextileGround,f.TextileMotif,'square'),rugMaterial());rug.castShadow=false;group.add(rug)
  }
else if(item.conceptId==='RUG-MCM-05') {
   const rug=mesh(rugGeometry(2.5,1.8,6,f.TextileGround,f.TextileMotif),rugMaterial());rug.castShadow=false;group.add(rug)
  }
else if(item.conceptId==='LMP-MCM-01') {
   const legs=[splay(-.26,-.26,-.035,-.025,1.18,.03,.045),splay(.26,-.26,.035,-.025,1.18,.03,.045),splay(0,.26,0,.035,1.18,.03,.045)],metal=[cylinder(.055,.05,20,1.165),cylinder(.006,.12,12,1.24),box(.412,.006,.006,0,1.29,0),box(.006,.006,.412,0,1.29,0)];group.add(mesh(merge(legs),material(f.Frame)),mesh(merge(metal),material(f.Metalwork)),mesh(coneShade(),material(f.Shade)))
  }
else throw new Error(`Unknown family model ${item.conceptId}`)
return group
}
