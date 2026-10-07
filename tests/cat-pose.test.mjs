import test from 'node:test';
import assert from 'node:assert/strict';
import { catRestPose,catBlink,easeCat } from '../src/lib/cat-pose.ts';

test('el descanso mueve articulaciones y conserva una transición suave entre poses',()=>{
  const stand={sit:0,sleep:0}, sit={sit:1,sleep:0},sleep={sit:0,sleep:1};
  const standing=catRestPose(stand,stand,1), seated=catRestPose(stand,sit,1), asleep=catRestPose(sit,sleep,1);
  assert.ok(seated.bodyY<standing.bodyY);
  assert.ok(seated.rearPitch<standing.rearPitch);
  assert.ok(asleep.headY<seated.headY-.2);
  assert.ok(asleep.frontPitch<-.9);
  assert.deepEqual(catRestPose(sit,sleep,0),catRestPose(sit,sit,1));
  assert.deepEqual(catRestPose(sleep,stand,1),standing);
  for(let i=0;i<=100;i++) assert.ok(Object.values(catRestPose(sit,sleep,i/100)).every(Number.isFinite));
  assert.equal(easeCat(-1),0); assert.equal(easeCat(2),1);
});
test('el parpadeo empieza abierto, cierra suavemente y vuelve a abrir',()=>{
  assert.equal(catBlink(0),1); assert.equal(catBlink(1),1);
  assert.ok(catBlink(.49)<.001);
  for(let i=0;i<=100;i++) assert.ok(catBlink(i/100)>=0 && catBlink(i/100)<=1);
});
