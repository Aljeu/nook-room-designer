// Authoritative local millimeter contours used by planning and model builders.
export const KIDNEY_CONTOUR = [[-560,-80],[-520,-220],[-360,-300],[-140,-310],[80,-270],[270,-170],[430,-160],[530,-60],[560,90],[490,240],[300,310],[80,290],[-90,190],[-200,80],[-350,70],[-490,40]] as const
export const CHAIR_CONTOUR = [[390,430],[-390,430],[-390,-430],[-300,-422],[-150,-414],[0,-410],[150,-414],[300,-422],[390,-430]] as const
export const TRIPOD_CONTOUR = [[-275,-275],[275,-275],[275,-245],[235,100],[100,235],[15,275],[-15,275],[-100,235],[-235,100],[-275,-245]] as const
export const polygonVertices=(points:readonly (readonly [number,number])[])=>points.map(([xMm,zMm])=>({xMm,zMm}))
