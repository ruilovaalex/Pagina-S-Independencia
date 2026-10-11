import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { dailyLove } from '../src/lib/daily-love.ts';

test('el detalle cambia a medianoche de Ecuador, no de UTC',()=>{
  const before = dailyLove(new Date('2026-10-12T04:59:59Z'));
  const after = dailyLove(new Date('2026-10-12T05:00:00Z'));
  assert.deepEqual(before,dailyLove(new Date('2026-10-11T12:00:00Z')));
  assert.notEqual(before.src,after.src);
  assert.notEqual(before.note,after.note);
});

test('las diez fotos existen y el ciclo vuelve a comenzar',async()=>{
  const sources = new Set();
  for(let day=11;day<21;day++) {
    const memory = dailyLove(new Date(`2026-10-${day}T12:00:00Z`));
    sources.add(memory.src);
    assert.ok(memory.note.length<50);
    await access(new URL(`../public${memory.src}`,import.meta.url));
  }
  assert.equal(sources.size,10);
  assert.deepEqual(dailyLove(new Date('2026-10-11T12:00:00Z')),dailyLove(new Date('2026-10-21T12:00:00Z')));
});
