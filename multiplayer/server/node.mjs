import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SqliteStore} from './node-store.mjs';
import {api} from './service.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function createServer({database=path.join(root,'work/multiplayer.sqlite'),store=new SqliteStore(database),clock=()=>Date.now()}={}){
 const server=http.createServer(async(req,res)=>{try{
  const host=req.headers.host||'localhost',url=new URL(req.url,'http://'+host);
  if(url.pathname.startsWith('/api/')){
   let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413);res.end('Requête trop grande');return}chunks.push(chunk)}
   const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
   headers.set('x-local-ip',req.socket.remoteAddress||'unknown');
   const request=new Request(url,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const result=await api(request,store,clock());res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  const allowed=new Set(['index.html','style.css','app.js','engine.js','team.js','layout.js','assets/logo.svg','assets/Jobbeurs.otf','multiplayer/index.html','multiplayer/app.js','multiplayer/style.css']);
  const name=decodeURIComponent(url.pathname).replace(/^\//,'').replace(/\/$/,'/index.html')||'index.html';
  if(!allowed.has(name)){res.writeHead(404);res.end('Introuvable');return}
  const data=await readFile(path.join(root,name));const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.otf':'font/otf'}[path.extname(name)];
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(data);
 }catch{res.writeHead(500);res.end('Erreur serveur');}});
 return {server,store};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const {server}=createServer({database:process.env.BUS_DB||undefined});const port=Number(process.env.PORT)||8080;
 server.listen(port,process.env.BUS_HOST||'127.0.0.1',()=>console.log(`Multijoueur — Test : http://${process.env.BUS_HOST||'127.0.0.1'}:${port}/multiplayer/`));
}
