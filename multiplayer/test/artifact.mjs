import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../.output/dist/server/index.js';
const sql={db:new DatabaseSync(':memory:'),close(){this.db.close()}};
const journal=JSON.parse(await readFile(new URL('../.output/drizzle/meta/_journal.json',import.meta.url),'utf8'));
assert.ok(journal.entries.length,'Deployment must contain the migration journal');
for(const entry of journal.entries){const migration=await readFile(new URL('../.output/drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');for(const statement of migration.split('--> statement-breakpoint').filter(s=>s.trim()))sql.db.prepare(statement).run();}
for(const name of ['limits','rooms'])assert.ok(sql.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name));
const db={prepare(query){return {bind(...values){return {async first(){return sql.db.prepare(query).get(...values)||null},async run(){return {meta:{changes:sql.db.prepare(query).run(...values).changes}}}}}}}};
const home=await worker.fetch(new Request('https://bus.test/multiplayer/'),{DB:db});assert.equal(home.status,200);assert.ok((await home.text()).includes('Multijoueur — Test'));
const privateFile=await worker.fetch(new Request('https://bus.test/multiplayer/server/room.mjs'),{DB:db});assert.equal(privateFile.status,404);
const created=await worker.fetch(new Request('https://bus.test/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test Worker'})}),{DB:db});assert.equal(created.status,201);const session=await created.json();
const resumed=await worker.fetch(new Request('https://bus.test/api/rooms/'+session.code,{headers:{Authorization:'Bearer '+session.token}}),{DB:db});assert.equal(resumed.status,200);assert.equal((await resumed.json()).me,session.me);
sql.close();console.log('OK : Worker ESM généré, assets publics, sources privées inaccessibles et API avec binding D1.');
