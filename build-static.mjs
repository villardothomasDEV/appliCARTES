import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const file of ['index.html','style.css','app.js','engine.js','team.js','layout.js','assets'])await cp(path.join(root,file),path.join(out,file),{recursive:true});
await writeFile(path.join(out,'.nojekyll'),'');
console.log('Version statique prête dans dist/ — aucun serveur applicatif nécessaire.');
