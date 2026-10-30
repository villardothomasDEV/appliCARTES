import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(new URL('../index.html',import.meta.url)));
const out=path.join(root,'multiplayer/.output');await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'dist/server'),{recursive:true});await mkdir(path.join(out,'.openai'),{recursive:true});
const assets={};const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.otf':'font/otf'};
for(const file of ['index.html','style.css','app.js','engine.js','team.js','layout.js','assets/logo.svg','assets/Jobbeurs.otf','multiplayer/index.html','multiplayer/style.css','multiplayer/app.js'])assets['/'+file]={data:(await readFile(path.join(root,file))).toString('base64'),type:mime[path.extname(file)]};
let source=await readFile(path.join(root,'engine.js'),'utf8');
for(const file of ['room.mjs','service.mjs','d1-store.mjs','worker.mjs'])source+='\n'+(await readFile(path.join(root,'multiplayer/server',file),'utf8')).replace(/^import .*;\n/gm,'').replace(/^export (?!default)/gm,'');
source='const STATIC_ASSETS='+JSON.stringify(assets)+';\n'+source;
await writeFile(path.join(out,'dist/server/index.js'),source);
await cp(path.join(root,'multiplayer/hosting.json'),path.join(out,'.openai/hosting.json'));
await cp(path.join(root,'multiplayer/drizzle'),path.join(out,'drizzle'),{recursive:true});
// Metadata used by Worker hosts; hosted D1 identity is supplied by Sites.
await writeFile(path.join(out,'dist/server/wrangler.json'),JSON.stringify({name:'le-bus-multiplayer-test',main:'index.js',compatibility_date:'2025-10-01',d1_databases:[{binding:'DB',database_name:'le-bus-multiplayer-test',database_id:'00000000-0000-0000-0000-000000000000',migrations_dir:'../../drizzle'}]},null,2));
console.log('Worker ESM + ressources embarquées + migrations Drizzle préparés dans multiplayer/.output/');
