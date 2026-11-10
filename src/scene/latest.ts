/** Generation guard for asynchronous scene requests. Invalidation also handles unmount. */
export function createLatestRequestGate(){
 let generation=0
 return {begin:()=>++generation,isCurrent:(token:number)=>token===generation,invalidate:()=>{generation++}}
}

/** Transient scope for a pending action; session is deliberately not project data. */
export type EditingScope = { projectId:string; sessionToken?:number }
export function sameEditingScope(start:EditingScope,current:EditingScope):boolean {
 return start.projectId===current.projectId && start.sessionToken===current.sessionToken
}
