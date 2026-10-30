import '../../engine.js';
const Bus=globalThis.Bus;
export const GRACE=30000, RESULT_MS=2800, ROOM_TTL=24*60*60*1000;
export class GameError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=400)=>{throw new GameError(message,status)};
export function randomId(){return crypto.randomUUID();}
export async function hash(token){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function newToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function newCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...crypto.getRandomValues(new Uint8Array(6))].map(n=>alphabet[n%32]).join('');}
function shuffle(cards){for(let i=cards.length-1;i>0;i--){let n;const limit=Math.floor(4294967296/(i+1))*(i+1);do{n=crypto.getRandomValues(new Uint32Array(1))[0]}while(n>=limit);const j=n%(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
function nameOf(name){if(typeof name!=='string'||!name.trim()||name.trim().length>24)fail('Choisissez un pseudo de 1 à 24 caractères.');return name.trim();}
export function configOf(input){const length=input?.length,checkpoints=input?.checkpoints;if(!Number.isInteger(length)||length<3||length>20||!Array.isArray(checkpoints)||checkpoints.some(n=>!Number.isInteger(n)||n<1||n>=length))fail('Autoroute : 3 à 20 cartes ; checkpoints avant l’arrivée.');return {length,checkpoints:[...new Set(checkpoints)].sort((a,b)=>a-b)};}
export function createRoom(code,name,tokenHash,now){const player={id:randomId(),name:nameOf(name),tokenHash,lastSeen:now};return {code,createdAt:now,expiresAt:now+ROOM_TTL,ownerId:player.id,players:[player],config:{length:8,checkpoints:[3,6]},status:'lobby',state:null,turn:0,turnId:0,turns:0,revision:1,resultUntil:0,receipts:[],notice:null};}
export function joinRoom(room,name,tokenHash,now){if(room.status!=='lobby')fail('La partie a commencé. Seuls les joueurs déjà inscrits peuvent reprendre leur place.',409);if(room.players.length>=12)fail('Ce salon est complet (12 joueurs).',409);name=nameOf(name);if(room.players.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))fail('Ce pseudo est déjà utilisé.');const player={id:randomId(),name,tokenHash,lastSeen:now};room.players.push(player);room.revision++;return player;}
export function authenticate(room,tokenHash){return room.players.find(p=>p.tokenHash===tokenHash)||fail('Place introuvable. Rejoignez le salon avec votre pseudo.',401);}
const online=(player,now)=>now-player.lastSeen<GRACE;
function nextOnline(room,start,now){for(let offset=1;offset<=room.players.length;offset++){const index=(start+offset)%room.players.length;if(online(room.players[index],now))return index;}return -1;}
export function tick(room,now){
  if(now>room.expiresAt)fail('Ce salon de test a expiré (24 heures). Créez un nouveau salon.',410);
  if(!online(room.players.find(p=>p.id===room.ownerId),now)){const replacement=room.players.find(p=>online(p,now));if(replacement){room.ownerId=replacement.id;room.revision++;}}
  if(room.status==='result'&&now>=room.resultUntil){
    room.turns++;room.turnId++;
    if(room.state.done)room.status='finished';
    else{Bus.next(room.state);const index=nextOnline(room,room.turn,now);if(index>=0)room.turn=index;room.status='playing';}
    room.revision++;
  }
  if(room.status==='playing'&&!online(room.players[room.turn],now)){
    const index=nextOnline(room,room.turn,now);
    if(index>=0&&index!==room.turn){room.notice=`${room.players[room.turn].name} est déconnecté : tour passé sans gorgée.`;room.turn=index;room.turnId++;room.state.phase='reveal';room.state.choice=null;room.revision++;}
  }
}
export function touch(room,player,now){player.lastSeen=Math.max(player.lastSeen,now);}
export function action(room,player,input,now){
  if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(input.requestId))fail('Identifiant de tentative manquant.');
  const fingerprint=JSON.stringify([input.type,input.turnId,input.choice,input.config]);
  const prior=room.receipts.find(r=>r.id===input.requestId&&r.playerId===player.id);
  if(prior){if(prior.fingerprint!==fingerprint)fail('Identifiant déjà utilisé pour une autre action.',409);return;}
  if(input.type==='configure'||input.type==='start'){
    if(player.id!==room.ownerId)fail('Seul le créateur du salon peut faire cela.',403);
    if(room.status!=='lobby')fail('La partie est déjà lancée.',409);
    if(input.type==='configure')room.config=configOf(input.config);
    else{const s=Bus.create(room.config.length,room.config.checkpoints);const deck=shuffle(['♠','♥','♦','♣'].flatMap(suit=>Array.from({length:13},(_,i)=>({rank:i+2,suit}))));s.road=deck.splice(0,room.config.length);s.deck=deck;room.state=s;room.turn=room.players.findIndex(p=>online(p,now));room.status='playing';room.turnId++;}
  }else if(input.type==='reveal'||input.type==='predict'){
    if(room.status!=='playing')fail('Attendez la fin du tirage.',409);
    if(player.id!==room.players[room.turn].id)fail('Ce n’est pas votre tour.',403);
    if(input.turnId!==room.turnId)fail('Ce tour est terminé. Le plateau va être actualisé.',409);
    if(input.type==='reveal'){if(room.state.phase!=='reveal')fail('Cette carte est déjà retournée.',409);Bus.reveal(room.state);}
    else{
      if(room.state.phase!=='choose')fail('Retournez d’abord la carte active.',409);
      if(!['plus','moins','egal'].includes(input.choice))fail('Prédiction invalide.');
      if(!room.state.deck.length)room.state.deck=shuffle(room.state.discard.splice(0));
      Bus.choose(room.state,input.choice);Bus.draw(room.state);room.status='result';room.resultUntil=now+RESULT_MS;room.notice=null;
    }
  }else fail('Action inconnue.');
  room.revision++;room.receipts.push({id:input.requestId,playerId:player.id,fingerprint});room.receipts=room.receipts.slice(-96);
}
export function snapshot(room,me,now){
 const s=room.state;
 return {code:room.code,me:me.id,ownerId:room.ownerId,players:room.players.map(p=>({id:p.id,name:p.name,connected:online(p,now)})),config:room.config,status:room.status,activeId:room.players[room.turn].id,activeName:room.players[room.turn].name,turnId:room.turnId,turns:room.turns,revision:room.revision,notice:room.notice,serverTime:now,expiresAt:room.expiresAt,resultUntil:room.resultUntil,
 state:s?{road:s.road.map((c,i)=>s.seen[i]?c:null),position:s.position,checkpoint:s.checkpoint,sips:s.points,phase:s.phase,deckCount:s.deck.length,discardCount:s.discard.length,done:s.done,last:room.status==='result'||room.status==='finished'?s.last:null}:null};
}
