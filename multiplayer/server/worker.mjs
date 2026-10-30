import {api} from './service.mjs';
import {D1Store} from './d1-store.mjs';
// STATIC_ASSETS is embedded by build.mjs. Never expose source or the SQLite database.
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')){
  if(!env.DB)return new Response(JSON.stringify({error:'La base de données du multijoueur n’est pas configurée.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  return api(request,new D1Store(env.DB));
 }
 let pathname=url.pathname;if(pathname.endsWith('/'))pathname+='index.html';
 const asset=STATIC_ASSETS[pathname];
 if(!asset)return new Response('Introuvable',{status:404});
 const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
 return new Response(bytes,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}};
