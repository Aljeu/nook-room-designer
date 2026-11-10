import * as THREE from 'three'
import type { FurnitureInstance } from '../domain/types'
import { merge, box, frustum, ringsGeometry, roundPoints, quad, board, profile, cylinder, drum, mesh, rugMaterial, rugGeometry, material } from './shared'
export function buildFamily(item:FurnitureInstance):THREE.Group { const group=new THREE.Group(),f=item.finishes
if(item.conceptId==='SOF-SCA-01') {
    const deck=ringsGeometry([{y:.14,points:quad(1.76,.84)},{y:.16,points:quad(1.8,.88)},{y:.30,points:quad(1.8,.88)},{y:.32,points:quad(1.76,.84)}]);const upholstery=[deck,box(.12,.26,.88,-.84,.45,0,.025),box(.12,.26,.88,.84,.45,0,.025),box(1.56,.48,.12,0,.56,-.38,.03),box(.774,.14,.69,-.393,.39,.055,.035),box(.774,.14,.69,.393,.39,.055,.035)];group.add(mesh(merge(upholstery),material(f.Upholstery)));const legs=[];for(const x of [-.78,.78])for(const z of [-.32,.32])legs.push(frustum(x,z,.14,.07,.05));group.add(mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='SOF-SCA-02') {
    const upholstery:THREE.BufferGeometry[]=[box(2.32,.18,.76,0,.17,-.38,.07)]
    for(const x of [-.78,0,.78]){
      upholstery.push(box(.75,.30,.72,x,.34,-.34,.11),box(.72,.40,.20,x,.62,-.62,.09))
    }
    upholstery.push(box(.79,.30,.76,-.78,.34,.37,.11),box(.77,.25,.64,-.78,.60,.43,.09))
    upholstery.push(box(.20,.54,1.42,-1.13,.34,.01,.07),box(.20,.52,.78,1.13,.33,-.36,.07))
    const legs=[]
    for(const x of [-1,1])for(const z of [-.67,-.12])legs.push(frustum(x*.99,z,.12,.045,.035))
    legs.push(frustum(-1.0,.67,.12,.045,.035),frustum(-.48,.67,.12,.045,.035))
    group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='SOF-SCA-03') {
    const upholstery=[box(1.74,.12,.88,0,.06,0,.05),box(1.78,.19,.90,0,.18,.035,.11),box(1.68,.19,.66,0,.31,.10,.10)]
    for(const x of [-.55,0,.55])upholstery.push(box(.53,.17,.61,x,.39,.095,.12))
    upholstery.push(box(1.66,.28,.20,0,.43,-.32,.09),box(.18,.30,.73,-.79,.29,-.02,.08),box(.18,.30,.73,.79,.29,-.02,.08))
    const frame=[box(1.70,.045,.83,0,.045,0,.035)]
    group.add(mesh(merge(upholstery),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)))
  }
else if(item.conceptId==='CFT-SCA-01') {const g=ringsGeometry([{y:.34,points:roundPoints(1.092,.572,.056,4)},{y:.344,points:roundPoints(1.1,.58,.06,4)},{y:.376,points:roundPoints(1.1,.58,.06,4)},{y:.38,points:roundPoints(1.092,.572,.056,4)}]);group.add(mesh(g,material(f.Top)));const legs=[];for(const x of [-.44,.44])for(const z of [-.18,.18])legs.push(frustum(x,z,.34,.06,.04));group.add(mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='RUG-SCA-01') {const rug=mesh(rugGeometry(2.4,1.7,0,f.TextileGround,f.TextileMotif),rugMaterial());rug.castShadow=false;group.add(rug)}
else if(item.conceptId==='CHR-SCA-01') {
    const frame:THREE.BufferGeometry[]=[];for(const x of [-.35,.35]){for(const z of [-.32,.32])frame.push(box(.06,.54,.06,x,.27,z));frame.push(box(.06,.05,.82,x,.565,0,.004),box(.06,.04,.7,x,.35,.04))}for(const z of [-.25,.37])frame.push(box(.64,.04,.04,0,.35,z));const stile:[[number,number],[number,number],[number,number],[number,number]]=[[.43,-.31],[.78,-.41],[.78,-.38],[.43,-.28]];frame.push(profile(-.32,-.28,stile),profile(.28,.32,stile));const back:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[[.43,-.272],[.438,-.283],[.752,-.387],[.76,-.382],[.76,-.318],[.752,-.307],[.438,-.203],[.43,-.208]];group.add(mesh(merge([box(.64,.08,.68,0,.41,.07,.02),profile(-.3,.3,back)]),material(f.Upholstery)),mesh(merge(frame),material(f.Frame)))
  }
else if(item.conceptId==='SFT-SCA-01') {
    const top=ringsGeometry([{y:.49,points:roundPoints(.414,.414,.021,4)},{y:.493,points:roundPoints(.42,.42,.024,4)},{y:.517,points:roundPoints(.42,.42,.024,4)},{y:.52,points:roundPoints(.414,.414,.021,4)}]);const frame:THREE.BufferGeometry[]=[];for(const x of [-.155,.155])for(const z of [-.155,.155])frame.push(frustum(x,z,.49,.04,.028));for(const z of [-.155,.155])frame.push(box(.27,.03,.02,0,.465,z));for(const x of [-.155,.155])frame.push(box(.02,.03,.27,x,.465,0));group.add(mesh(top,material(f.Top)),mesh(merge(frame),material(f.Frame)))
  }
else if(item.conceptId==='MED-SCA-01') {
    const body=[board(1.6,.02,.4,.47),board(1.6,.02,.4,.13),box(.02,.32,.4,-.79,.3,0),box(.02,.32,.4,.79,.3,0),box(1.56,.32,.016,0,.3,-.192),box(.02,.32,.368,-.25,.3,0),box(.02,.32,.368,.25,.3,0)];const fronts=[box(.516,.316,.016,-.52,.3,.192,.002),box(.516,.316,.016,.52,.3,.192,.002)];const legs=[];for(const x of [-.7,.7])for(const z of [-.14,.14])legs.push(box(.025,.12,.025,x,.06,z));group.add(mesh(merge(body),material(f.Body)),mesh(merge(fronts),material(f.Fronts)),mesh(merge(legs),material(f.Frame)))
  }
else if(item.conceptId==='BKC-SCA-01') {
    const body=[box(.024,1.6,.32,-.388,.8,0),box(.024,1.6,.32,.388,.8,0),board(.752,.024,.32,.012),board(.752,.024,.32,1.588),box(.752,1.552,.012,0,.8,-.154)];for(const y of [.406,.8,1.194]){const shelf=board(.752,.024,.308,y);shelf.translate(0,0,.006);body.push(shelf)}group.add(mesh(merge(body),material(f.Body)))
  }
else if(item.conceptId==='LMP-SCA-01') {
    const metal=[cylinder(.14,.024,32,.012),cylinder(.009,1.256,12,.652),box(.412,.006,.006,0,1.28,0),box(.006,.006,.412,0,1.28,0)];group.add(mesh(merge(metal),material(f.Metalwork)),mesh(drum(),material(f.Shade)))
  }
else throw new Error(`Unknown family model ${item.conceptId}`)
return group
}
