import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('guardado preparado: RLS, objetos propios, inventario y revisiones sin alterar compras',async()=>{
  const db=new PGlite();
  const owner='00000000-0000-0000-0000-000000000001', other='00000000-0000-0000-0000-000000000002';
  const ownProduct='00000000-0000-0000-0000-000000000011', otherProduct='00000000-0000-0000-0000-000000000022';
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      insert into auth.users values ('${owner}'),('${other}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202609240001_initial_schema.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261007013050_personal_notebook_home.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261007232201_home_personalization.sql',import.meta.url),'utf8'));
    await db.query('insert into public.products(id,user_id,name,bought,paid_price) values($1,$2,$3,true,50),($4,$5,$6,true,80)',[ownProduct,owner,'Cama',otherProduct,other,'Sofá']);
    await db.exec(`insert into public.home_saves(user_id) values('${other}'); select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated;`);
    const rooms={living:{},bedroom:{[ownProduct]:{x:1.8,z:.8,rotation:0}},kitchen:{},bathroom:{}};
    await db.query('insert into public.home_saves(rooms) values($1)',[JSON.stringify(rooms)]);
    assert.equal((await db.query('select user_id from public.home_saves')).rows.length,1);
    await db.query('update public.home_saves set personalization=$1',[JSON.stringify({floorColors:{living:'#ffffff'},decorations:{living:{plant:1}},catName:'Michi',room:'living'})]);
    assert.equal((await db.query("select personalization->>'catName' as name from public.home_saves")).rows[0].name,'Michi');
    await assert.rejects(db.query('update public.home_saves set personalization=$1',[JSON.stringify({floorColors:{},decorations:{},catName:'x'.repeat(25),room:'living'})]),e=>e.code==='23514');
    assert.equal((await db.query('update public.home_saves set rooms=$1 where revision=1 returning revision',[JSON.stringify({...rooms,bedroom:{}})])).rows[0].revision,2);
    assert.equal((await db.query('update public.home_saves set rooms=$1 where revision=0 returning revision',[JSON.stringify(rooms)])).rows.length,0,'revisión obsoleta no sobrescribe');
    assert.equal((await db.query('select bought,paid_price from public.products where id=$1',[ownProduct])).rows[0].bought,true);
    const foreign={...rooms,living:{[otherProduct]:{x:0,z:0,rotation:0}}};
    await assert.rejects(db.query('update public.home_saves set rooms=$1',[JSON.stringify(foreign)]),e=>e.code==='23514');
    await assert.rejects(db.query('update public.home_saves set rooms=$1',[JSON.stringify({...rooms,living:rooms.bedroom})]),e=>e.code==='23514');
    await assert.rejects(db.query('update public.home_saves set user_id=$1',[other]),e=>e.code==='42501');
    await db.exec('insert into public.financial_preferences(opening_balance,monthly_budget) values(100,500)');
    await assert.rejects(db.exec('update public.financial_preferences set monthly_budget=-1'),e=>e.code==='23514');
    await db.exec('reset role; set role anon');
    await assert.rejects(db.exec('select * from public.home_saves'),e=>e.code==='42501');
    await assert.rejects(db.exec('select * from public.financial_preferences'),e=>e.code==='42501');
  } finally {await db.close();}
});
