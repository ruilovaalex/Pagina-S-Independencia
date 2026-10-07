export interface CatRest { sit:number; sleep:number }
const clamp = (value:number) => Math.min(1,Math.max(0,value));
export function easeCat(value:number) { const t=clamp(value); return t*t*(3-2*t); }
/** Blend joints, not the scale of the entire animal, so sleeping never flattens it. */
export function catRestPose(from:CatRest,to:CatRest,progress:number) {
  const t=easeCat(progress);
  const sit=from.sit+(to.sit-from.sit)*t, sleep=from.sleep+(to.sleep-from.sleep)*t;
  return {
    sit,sleep,
    bodyY:.29-.06*sit-.12*sleep, bodyZ:-.065-.045*sit,
    bodyPitch:-.32*sit+.14*sleep,
    headY:.54+.03*sit-.31*sleep, headZ:.17-.075*sleep,
    headRoll:-.22*sleep, headPitch:.12*sleep,
    frontY:.24-.075*sleep, frontPitch:-1.03*sleep,
    rearY:.25-.07*sit-.085*sleep, rearPitch:-.65*sit-.82*sleep,
    tailY:.27-.11*sleep, tailYaw:-.95*sleep,
  };
}
/** A finite blink closes and reopens with zero discontinuity at either end. */
export function catBlink(progress:number) {
  const t=clamp((progress-.43)/.12);
  return 1-Math.sin(t*Math.PI)**2;
}
