import * as THREE from 'three'
import type { WallConcept } from '../catalog/wall'
import type { WindowOpening } from '../domain/types'
import { box, material, merge, mesh } from './shared'

function mappedCane(g:THREE.BufferGeometry,width:number){const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();const p=flat.getAttribute('position'),n=flat.getAttribute('normal'),uv:number[]=[],enabled:number[]=[];for(let i=0;i<p.count;i++){uv.push(p.getX(i)*1000+width/2,p.getY(i)*1000);enabled.push(Math.abs(n.getZ(i))>.5?1:0)}flat.setAttribute('caneCoordMm',new THREE.Float32BufferAttribute(uv,2));flat.setAttribute('canePatternEnabled',new THREE.Float32BufferAttribute(enabled,1));return flat}
function named(g:THREE.BufferGeometry,name:string,finish:string){const result=mesh(g,material(finish));result.name=name;result.userData.finish=finish;return result}
function frame(w:number,h:number,d:number,border:number){return merge([box(border,h,d,-(w-border)/2,h/2,d/2),box(border,h,d,(w-border)/2,h/2,d/2),box(w-2*border,border,d,0,border/2,d/2),box(w-2*border,border,d,0,h-border/2,d/2)])}
function roundedPath(path:THREE.Path,w:number,h:number,y0:number,r:number){const x=-w/2,y=y0;path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);path.closePath()}
/** Origin is bottom center, +Z points into the room. */
export function buildWallLocal(c:WallConcept):THREE.Group{
 const group=new THREE.Group(),w=c.widthMm/1000,h=c.heightMm/1000,d=c.depthMm/1000,frameCode=c.defaults.Frame??'OAK'
 if(c.id==='TV-WALL-01'){
  const bracket=[box(.72,.46,.025,0,h/2,.0125,.012),box(.22,.50,.018,-.33,h/2,.034),box(.22,.50,.018,.33,h/2,.034)]
  const bezel=[box(w,h,d-.006,0,h/2,(d-.006)/2,.012),box(w-.035,.012,.006,0,.03,d-.003),box(w-.035,.012,.006,0,h-.03,d-.003)]
  group.add(named(merge([...bracket,...bezel]),'Frame',c.defaults.Frame),named(box(w-.06,h-.06,.006,0,h/2,d-.003,.006),'Screen',c.defaults.Screen))
 }else if(c.id==='FAN-WALL-01'){
  const centerY=.32,bracket:THREE.BufferGeometry[]=[box(.11,.32,.035,0,.16,.0175),box(.075,.09,.17,0,centerY,.12),box(.09,.11,.065,0,centerY,.225)]
  const motor=new THREE.CylinderGeometry(.052,.052,.13,24);motor.rotateX(Math.PI/2);motor.translate(0,centerY,.17);bracket.push(motor)
  const hub=new THREE.CylinderGeometry(.045,.045,.045,24);hub.rotateX(Math.PI/2);hub.translate(0,centerY,.2775);bracket.push(hub)
  const grille:THREE.BufferGeometry[]=[]
  for(const radius of [.2355,.19,.145,.1,.055]){const ring=new THREE.TorusGeometry(radius,.0045,5,40);ring.translate(0,centerY,.27);grille.push(ring)}
  for(let i=0;i<24;i++){const spoke=new THREE.BoxGeometry(.47,.004,.007);spoke.rotateZ(i*Math.PI/24);spoke.translate(0,centerY,.27);grille.push(spoke)}
  const bladeShape=new THREE.Shape();bladeShape.moveTo(.025,-.01);bladeShape.quadraticCurveTo(.04,.035,.075,.08);bladeShape.quadraticCurveTo(.105,.12,.14,.12);bladeShape.quadraticCurveTo(.13,.08,.085,.045);bladeShape.quadraticCurveTo(.045,.015,.025,-.01);bladeShape.closePath()
  const blades=Array.from({length:3},(_,i)=>{const blade=new THREE.ShapeGeometry(bladeShape);blade.rotateZ(i*Math.PI*2/3);blade.translate(0,centerY,.225);return blade})
  group.add(named(merge(bracket),'Shell',c.defaults.Shell),named(merge(grille),'Grille',c.defaults.Grille),named(merge(blades),'Blade',c.defaults.Blade))
 }else if(c.id==='AC-SPLIT-01'){
  // Interior head sits on the room side; its condenser and refrigerant lines sit behind the wall.
  const shell=[box(1.3,.27,.27,0,.65,.15,.035),box(1.2,.045,.27,0,.505,.15),box(1.22,.01,.25,0,.795,.15)]
  const front=[box(1.22,.012,.014,0,.69,.292),box(.055,.032,.008,-.58,.65,.306)]
  const louvers:THREE.BufferGeometry[]=[]
  for(let i=0;i<8;i++)louvers.push(box(1.06,.012,.03,0,.535+i*.013,.285))
  shell.push(box(.78,.4,.38,0,.2,-.46,.035),box(.7,.035,.38,0,.38,-.46),box(.7,.035,.38,0,.02,-.46))
  const fanParts:THREE.BufferGeometry[]=[]
  for(const [radius,tube,segments] of [[.175,.009,40],[.13,.006,36],[.08,.005,32]] as const){const ring=new THREE.TorusGeometry(radius,tube,6,segments);ring.translate(0,.2,-.642206);fanParts.push(ring)}
  for(let i=0;i<8;i++){const bar=new THREE.BoxGeometry(.36,.008,.012);bar.rotateZ(i*Math.PI/8);bar.translate(0,.2,-.642206);fanParts.push(bar)}
  const pipeA=new THREE.CatmullRomCurve3([new THREE.Vector3(.518,.61,-.025),new THREE.Vector3(.518,.61,-.15),new THREE.Vector3(.45,.43,-.26),new THREE.Vector3(.38,.23,-.44)])
  const pipeB=new THREE.CatmullRomCurve3([new THREE.Vector3(.552,.64,-.025),new THREE.Vector3(.552,.64,-.15),new THREE.Vector3(.43,.46,-.28),new THREE.Vector3(.38,.26,-.43)])
  group.add(named(merge([...shell]),'Shell',c.defaults.Shell),named(merge([...front,...louvers,...fanParts,new THREE.TubeGeometry(pipeA,12,.012,6,false),new THREE.TubeGeometry(pipeB,12,.008,6,false)]),'Grille',c.defaults.Grille))
 }else if(c.id==='AC-WINDOW-01'){
  // The chassis crosses the wall, with an intake and condenser grille on its outdoor end.
  group.add(named(box(.9,.6,.81,0,.30,-.145,.025),'Shell',c.defaults.Shell))
  const inside=[box(.82,.50,.035,0,.30,.19,.018),box(.47,.40,.012,-.17,.32,.214,.008),box(.27,.42,.012,.25,.32,.214,.008),box(.28,.028,.014,.25,.51,.224),box(.28,.028,.014,.25,.13,.224)]
  for(let i=0;i<15;i++)inside.push(box(.008,.36,.018,-.39+i*.031,.32,.226))
  for(let i=0;i<7;i++)inside.push(box(.25,.012,.022,.25,.2+i*.04,.23))
  inside.push(box(.12,.055,.006,.25,.12,.228),box(.07,.022,.004,.25,.12,.233))
  group.add(named(merge(inside),'Grille',c.defaults.Grille))
  const outside=[box(.82,.5,.022,0,.3,-.515)]
  for(let i=0;i<16;i++)outside.push(box(.76,.012,.018,0,.08+i*.028,-.536))
  for(let side of [-1,1]){
   outside.push(box(.012,.45,.022,side*.43,.3,-.16))
   for(let i=0;i<10;i++)outside.push(box(.012,.012,.33,side*.44,.1+i*.043,-.16))
  }
  group.add(named(merge(outside),'Grille',c.defaults.Grille))
 }else if(c.id==='VENT-WALL-01'){
  const trim=[frame(w,h,.055,.05),frame(w,h,.035,.05)]
  trim[1].translate(0,0,-.115)
  const slats:THREE.BufferGeometry[]=[]
  for(let i=0;i<9;i++){const y=.055+i*.041;slats.push(box(.69,.012,.03,0,y,.055),box(.69,.012,.03,0,y,-.115))}
  group.add(named(merge(trim),'Frame',c.defaults.Frame),named(merge(slats),'Grille',c.defaults.Grille))
 }else if(c.id==='PAN-FIL-02'||c.id==='PAN-GEN-01')group.add(named(box(w,h,d,0,h/2,d/2),'Body',c.defaults.Body))
 else if(c.id==='PAN-GEN-02'){
  const parts=[box(w,h,.012,0,h/2,.006)];for(let x=-w/2+.025;x<w/2;x+=.075)parts.push(box(.035,h,d-.012,x,h/2,.012+(d-.012)/2));group.add(named(merge(parts),'Body',c.defaults.Body))
 }else if(c.category==='sconce'){
  const frameName=c.defaults.Frame?'Frame':'Metalwork',frameFinish=c.defaults[frameName],plate=box(w*.48,h,.025,0,h/2,.0125)
  if(c.id==='WLP-GEN-02'){group.add(named(merge([plate,box(w,h*.35,d,0,h*.72,d/2)]),frameName,frameFinish))}
  else {const narrow=c.id==='WLP-FIL-02';group.add(named(narrow?merge([plate,box(w,.018,.025,0,h*.77,.0125)]):plate,frameName,frameFinish));const name=c.defaults.Weave?'Weave':'Shade',finish=c.defaults[name],shade=box(narrow?w*.8:w,narrow?h*.25:h*.45,d-.025,0,h*.62,.025+(d-.025)/2);group.add(named(name==='Weave'?mappedCane(shade,c.widthMm):shade,name,finish))}
 }else if(c.id==='MIR-FIL-01'){
  const border=.035,r=.055,shape=new THREE.Shape(),hole=new THREE.Path();roundedPath(shape,w,h,0,r);roundedPath(hole,w-2*border,h-2*border,border,r-border);shape.holes.push(hole);group.add(named(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:6}),'Frame',frameCode));const inner=new THREE.Shape();roundedPath(inner,w-2*border,h-2*border,border,r-border);const panel=new THREE.ShapeGeometry(inner,6);panel.translate(0,0,d-.01);group.add(named(panel,'Mirror','MIRROR'))
 }else if(c.id==='MIR-GEN-01'){
  const r=w/2,shape=new THREE.Shape();shape.absarc(0,h/2,r,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,h/2,r-.035,0,Math.PI*2,true);shape.holes.push(hole);group.add(named(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:32}),'Frame',frameCode));const panel=new THREE.CircleGeometry(r-.035,32);panel.translate(0,h/2,d-.01);group.add(named(panel,'Mirror','MIRROR'))
 }else{
  const border=Math.min(.04,w/8,h/8);group.add(named(frame(w,h,d,border),'Frame',frameCode))
  const panel=box(w-2*border,h-2*border,Math.max(.005,d-.01),0,h/2,(d-.01)/2)
  if(c.defaults.Weave)group.add(named(mappedCane(panel,c.widthMm),'Weave','CAN'))
  else if(c.id.startsWith('MIR-'))group.add(named(panel,'Mirror','MIRROR'))
  else {
   group.add(named(panel,'Artwork','OFF'))
   if(c.category==='art'&&/^ART-GEN-0[2-5]$/.test(c.id)){
    const print=new THREE.PlaneGeometry(w-2*border-.01,h-2*border-.01)
    print.translate(0,h/2,d-.001)
    group.add(named(print,'Graphic',`ARTWORK:${c.id}`))
   }else if(c.category==='art')group.add(named(box(w*.3,h*.22,.002,0,h*.55,d-.009),'Graphic',c.id==='ART-FIL-01'?'BRZ':'BLU'))
  }
 }
 return group
}
function curtainPanel(startX:number,endX:number,height:number,z:number){
 const columns=32,rows=12,positions:number[]=[],breezeWeights:number[]=[],indices:number[]=[]
 for(let row=0;row<=rows;row++){
  const v=row/rows,y=height*v
  for(let column=0;column<=columns;column++){
   const u=column/columns,x=startX+(endX-startX)*u,pleat=Math.cos(u*Math.PI*20)*.008
   positions.push(x,y,z+pleat);breezeWeights.push(1-v)
  }
 }
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1
  indices.push(a,b,c,b,d,c)
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('breezeWeight',new THREE.Float32BufferAttribute(breezeWeights,1));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}
/** Window treatments use the opening's own dimensions, so their span always tracks the window. */
export function buildWindowLocal(opening:WindowOpening):THREE.Group{
 const group=new THREE.Group(),w=opening.widthMm/1000,h=opening.heightMm/1000,b=Math.min(.04,w/8,h/8),style=opening.styleId??'WIN-GEN-01',components=[frame(w,h,.06,b)]
 if(style==='WIN-FIL-01'||style==='WIN-FIL-02'||style==='WIN-GEN-02')components.push(box(.028,h-2*b,.06,0,h/2,.03))
 if(style==='WIN-FIL-01'){for(let k=1;k<4;k++)components.push(box(w-2*b,.018,.06,0,b+(h-2*b)*k/4,.03));for(const x of [-w/4,w/4])components.push(box(.018,h-2*b,.06,x,h/2,.03))}
 if(style==='WIN-GEN-03')components.push(box(.025,h-2*b,.06,w*.22,h/2,.03))
 const sliding=style==='WIN-FIL-01'||style==='WIN-GEN-02',glass=sliding?merge([box((w-2*b)/2,h-2*b,.008,-(w-2*b)/4,h/2,.012),box((w-2*b)/2,h-2*b,.008,(w-2*b)/4,h/2,.026)]):box(w-2*b,h-2*b,.008,0,h/2,.012)
 group.add(named(merge(components),'Frame','OAK'));group.add(named(glass,'Glazing','GLASS'))
 if(opening.treatment==='blinds'){
  const blindParts=[box(w,.035,.052,0,h-.025,.079)],count=Math.max(5,Math.min(18,Math.round(h/.085)))
  for(let index=0;index<count;index++)blindParts.push(box(w,.016,.03,0,b+(h-2*b)*(index+.5)/count,.08))
  group.add(named(merge(blindParts),'Blinds','BLINDS'))
 }
 if(opening.treatment==='curtains'){
  const curtains=merge([curtainPanel(-w/2,0,h,.084),curtainPanel(0,w/2,h,.084)],false,true)
  group.add(named(curtains,'Curtains','CURTAIN'));group.add(named(box(w,.035,.045,0,h-.025,.078),'Curtain rod','BRZ'))
 }
 return group
}
