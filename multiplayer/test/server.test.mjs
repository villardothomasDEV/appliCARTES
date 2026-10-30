import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {SqliteStore} from '../server/node-store.mjs';import {api} from '../server/service.mjs';import {GRACE,RESULT_MS} from '../server/room.mjs';import {D1Store} from '../server/d1-store.mjs';
let seq=0;
function harness(store=new SqliteStore(':memory:')){let now=100000;return {store,advance(ms){now+=ms},async call(route,{token,body,origin}={}){const response=await api(new Request('http://bus.test'+route,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})}),store,now);return {status:response.status,body:await response.json()};}};}
const command=(room,type,extra={})=>({type,turnId:room.turnId,requestId:'request-'+(++seq),...extra});
async function group(h,count=3){const first=(await h.call('/api/rooms',{body:{name:'Alice'}})).body;const people=[first];for(let i=1;i<count;i++)people.push((await h.call(`/api/rooms/${first.code}/join`,{body:{name:'Joueur '+i}})).body);return people;}
async function start(h,people){const p=people[0];return (await h.call(`/api/rooms/${p.code}/actions`,{token:p.token,body:command(p,'start')})).body;}
async function force(h,code,{at=0,checkpoint=0,old=5,drawn=14}={}){const entry=await h.store.load(code);entry.room.state.position=at;entry.room.state.checkpoint=checkpoint;entry.room.state.road[at]={rank:old,suit:'♠'};entry.room.state.deck.push({rank:drawn,suit:'♥'});await h.store.compareAndSwap(code,entry.version,entry.room,100000);}

test('salon, configuration réservée au créateur, cartes cachées et clés privées',async()=>{
 const h=harness(),p=await group(h);const code=p[0].code;assert.match(code,/^[A-Z2-9]{6}$/);
 assert.equal((await h.call(`/api/rooms/${code}`)).status,401);
 assert.equal((await h.call(`/api/rooms/${code}/actions`,{token:p[1].token,body:command(p[1],'start')})).status,403);
 let response=await h.call(`/api/rooms/${code}/actions`,{token:p[0].token,body:command(p[0],'configure',{config:{length:9,checkpoints:[2,5]}})});assert.equal(response.status,200);
 const view=await start(h,p);assert.equal(view.state.road.length,9);assert.ok(view.state.road.every(c=>c===null));assert.equal(view.state.deckCount,43);assert.equal(view.state.deck,undefined);assert.equal(view.state.discard,undefined);assert.ok(view.players.every(x=>!x.token&&!x.tokenHash));
 assert.equal((await h.call(`/api/rooms/${code}/join`,{body:{name:'Retardataire'}})).status,409);
 h.store.close();
});
test('serveur : hors tour, double révélation, doubles prédictions concurrentes et idempotence',async()=>{
 const h=harness(),p=await group(h,2);let view=await start(h,p);const endpoint=`/api/rooms/${view.code}/actions`;
 await force(h,view.code);
 assert.equal((await h.call(endpoint,{token:p[1].token,body:command(view,'reveal')})).status,403);
 const reveal=command(view,'reveal');assert.equal((await h.call(endpoint,{token:p[0].token,body:reveal})).status,200);
 assert.equal((await h.call(endpoint,{token:p[0].token,body:reveal})).status,200);
 assert.equal((await h.call(endpoint,{token:p[0].token,body:command(view,'reveal')})).status,409);
 const predict=command(view,'predict',{choice:'plus'});
 const results=await Promise.all([h.call(endpoint,{token:p[0].token,body:predict}),h.call(endpoint,{token:p[0].token,body:command(view,'predict',{choice:'plus'})})]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 const after=(await h.call(`/api/rooms/${view.code}`,{token:p[1].token})).body;assert.equal(after.state.position,1);assert.equal(after.state.road[0].rank,14);assert.ok(after.state.road.slice(1).every(x=>x===null));
 assert.equal((await h.call(endpoint,{token:p[0].token,body:predict})).status,200);
 h.advance(RESULT_MS+1);view=(await h.call(`/api/rooms/${view.code}`,{token:p[1].token})).body;assert.equal(view.activeId,p[1].me);assert.equal(view.turns,1);
 assert.equal((await h.call(endpoint,{token:p[0].token,body:command({...view,turnId:1},'reveal')})).status,403);
 assert.equal((await h.call(endpoint,{token:p[1].token,body:command({...view,turnId:1},'reveal')})).status,409);h.store.close();
});
test('2, 3 et 5 téléphones : rotation circulaire, pénalité inclusive et checkpoint commun',async()=>{
 for(const count of [2,3,5]){const h=harness(),people=await group(h,count);let view=await start(h,people);
  for(let turn=0;turn<count*2;turn++){
   const actor=people[turn%count],success=turn%2===0,checkpoint=success?0:2,at=success?0:4;
   await force(h,view.code,{at,checkpoint,old:5,drawn:14});
   const endpoint=`/api/rooms/${view.code}/actions`;
   assert.equal(view.activeId,actor.me);
   await h.call(endpoint,{token:actor.token,body:command(view,'reveal')});
   const result=await h.call(endpoint,{token:actor.token,body:command(view,'predict',{choice:success?'plus':'moins'})});assert.equal(result.status,200);
   assert.equal(result.body.state.position,success?1:2);if(!success){assert.equal(result.body.state.last.penalty,3);assert.equal(result.body.state.checkpoint,2);}
   const observed=(await h.call(`/api/rooms/${view.code}`,{token:people[(turn+1)%count].token})).body;assert.deepEqual(observed.state,result.body.state);
   h.advance(RESULT_MS+1);view=(await h.call(`/api/rooms/${view.code}`,{token:people[(turn+1)%count].token})).body;
   assert.equal(view.activeId,people[(turn+1)%count].me);assert.equal(view.state.sips,Math.floor((turn+1)/2)*3);
  }h.store.close();
 }
});
test('départ sans checkpoint, reprise de place et joueur hors ligne passé après 30 secondes',async()=>{
 const h=harness(),p=await group(h,3);let view=await start(h,p);await force(h,view.code,{at:2,checkpoint:0});const endpoint=`/api/rooms/${view.code}/actions`;
 await h.call(endpoint,{token:p[0].token,body:command(view,'reveal')});view=(await h.call(endpoint,{token:p[0].token,body:command(view,'predict',{choice:'moins'})})).body;assert.equal(view.state.last.penalty,3);assert.equal(view.state.position,0);
 h.advance(RESULT_MS+1);view=(await h.call(`/api/rooms/${view.code}`,{token:p[1].token})).body;assert.equal(view.activeId,p[1].me);
 h.advance(GRACE+1);view=(await h.call(`/api/rooms/${view.code}`,{token:p[2].token})).body;assert.equal(view.activeId,p[2].me);assert.equal(view.ownerId,p[2].me);assert.equal(view.state.sips,3);
 const recovered=(await h.call(`/api/rooms/${view.code}`,{token:p[1].token})).body;assert.equal(recovered.me,p[1].me);assert.equal(recovered.activeId,p[2].me);assert.equal(recovered.players.length,3);h.store.close();
});
test('persistance SQLite : redémarrage serveur et reprise avec la même clé',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'bus-mp-')),file=path.join(dir,'rooms.sqlite');let h=harness(new SqliteStore(file));const p=await group(h,2);const view=await start(h,p);h.store.close();h=harness(new SqliteStore(file));const restored=await h.call(`/api/rooms/${view.code}`,{token:p[1].token});assert.equal(restored.status,200);assert.equal(restored.body.me,p[1].me);assert.deepEqual(restored.body.state,view.state);h.store.close();rmSync(dir,{recursive:true});
});
test('pseudo unique, configuration valide, origine, limite et expiration',async()=>{
 const h=harness(),p=(await group(h,1))[0];assert.equal((await h.call(`/api/rooms/${p.code}/join`,{body:{name:'alice'}})).status,400);
 assert.equal((await h.call(`/api/rooms/${p.code}/actions`,{token:p.token,body:command(p,'configure',{config:{length:2,checkpoints:[2]}})})).status,400);
 assert.equal((await h.call(`/api/rooms/${p.code}/actions`,{token:p.token,body:command(p,'start'),origin:'https://evil.test'})).status,403);
 for(let i=0;i<11;i++)await h.call('/api/rooms',{body:{name:'X'}});assert.equal((await h.call('/api/rooms',{body:{name:'X'}})).status,429);
 h.advance(24*60*60*1000+1);assert.equal((await h.call(`/api/rooms/${p.code}`,{token:p.token})).status,410);h.store.close();
});
test('D1 : le même contrat de stockage et les écritures conditionnelles',async()=>{
 const sqlite=new SqliteStore(':memory:');const db={prepare(sql){return {bind(...values){return {async first(){return sqlite.db.prepare(sql).get(...values)||null},async run(){const result=sqlite.db.prepare(sql).run(...values);return {meta:{changes:result.changes}}}}}}}};
 const h=harness(new D1Store(db)),p=await group(h,2),view=await start(h,p);assert.equal(view.status,'playing');const entry=await h.store.load(view.code);assert.equal(await h.store.compareAndSwap(view.code,entry.version-1,entry.room,100000),false);sqlite.close();
});
