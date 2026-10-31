import {GameError,createRoom,joinRoom,authenticate,tick,touch,action,snapshot,newCode,newToken,hash,ROOM_TTL} from './room.mjs';
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function api(request,store,now=Date.now()){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(request.method==='POST'){
   const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw new GameError('Origine non autorisée.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new GameError('JSON requis.',415);
  }
  if(!['GET','POST'].includes(request.method))throw new GameError('Méthode non autorisée.',405);
  let input={};if(request.method==='POST'){const reader=request.body?.getReader();let chunks=[],total=0;if(reader){while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>8192){await reader.cancel();throw new GameError('Requête trop grande.',413);}chunks.push(part.value);}}const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const raw=new TextDecoder().decode(bytes);if(raw.length>8192)throw new GameError('Requête trop grande.',413);try{input=JSON.parse(raw)}catch{throw new GameError('JSON invalide.');}if(!input||typeof input!=='object'||Array.isArray(input))throw new GameError('Objet JSON requis.');}
  if(path==='/api/rooms'&&request.method==='POST'){
   const key=request.headers.get('cf-connecting-ip')||request.headers.get('x-local-ip')||'anonymous';
   if(!await store.limit('create:'+key,12,60*60*1000,now))throw new GameError('Trop de salons créés. Réessayez plus tard.',429);
   const token=newToken(),tokenHash=await hash(token);
   for(let i=0;i<6;i++){const room=createRoom(newCode(),input.name,tokenHash,now);if(await store.insert(room,now)){await store.cleanup(now-ROOM_TTL,now);return response({token,...snapshot(room,room.players[0],now)},201);}}
   throw new GameError('Impossible de créer un code. Réessayez.',503);
  }
  const match=path.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|actions))?$/);
  if(!match)throw new GameError('Salon ou route introuvable.',404);
  const [,code,operation]=match;
  const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const tokenHash=token?await hash(token):null;
  if(operation==='join'&&request.method==='POST'){
   const key=request.headers.get('cf-connecting-ip')||request.headers.get('x-local-ip')||'anonymous';
   if(!await store.limit('join:'+key,60,60000,now))throw new GameError('Trop de tentatives. Patientez une minute.',429);
  }
  for(let attempt=0;attempt<16;attempt++){
   const entry=await store.load(code);if(!entry)throw new GameError('Salon introuvable. Vérifiez le code.',404);
   const room=entry.room;let me,newKey;
   if(operation==='join'&&request.method==='POST'){
    if(tokenHash)me=room.players.find(p=>p.tokenHash===tokenHash);
    if(!me){newKey=newToken();me=joinRoom(room,input.name,await hash(newKey),now);}
   }else{if(!tokenHash)throw new GameError('Clé de reprise manquante.',401);me=authenticate(room,tokenHash);}
   // Reconnection heartbeat happens before expiry/turn selection so a returning player is present.
   touch(room,me,now);tick(room,now);
   if(operation==='actions'&&request.method==='POST')action(room,me,input,now);
   else if(operation!=='join'&&request.method!=='GET')throw new GameError('Méthode non autorisée.',405);
   if(await store.compareAndSwap(code,entry.version,room,now))return response({...snapshot(room,me,now),...(newKey?{token:newKey}:{})});
  }
  throw new GameError('Salon très actif. Réessayez.',409);
 }catch(error){if(!(error instanceof GameError))console.error('Multiplayer storage error',error?.message);return response({error:error instanceof GameError?error.message:'Le serveur est momentanément indisponible.'},error instanceof GameError?error.status:503);}
}
