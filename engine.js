(function(root){
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function create(length,checkpoints){let deck=shuffle(['♠','♥','♦','♣'].flatMap(suit=>Array.from({length:13},(_,i)=>({rank:i+2,suit}))));return {road:deck.splice(0,length),deck,discard:[],checkpoints,position:0,checkpoint:0,points:0,seen:[],phase:'reveal',choice:null,last:null,done:false}}
function reveal(s){if(s.phase!=='reveal')return;s.seen[s.position]=true;s.phase='choose'}
function choose(s,c){if(s.phase!=='choose'||!['plus','moins','egal'].includes(c))return;s.choice=c;s.phase='draw'}
function draw(s){if(s.phase!=='draw')return;if(!s.deck.length)s.deck=shuffle(s.discard.splice(0));let card=s.deck.pop(),old=s.road[s.position];let ok=s.choice==='plus'?card.rank>old.rank:s.choice==='moins'?card.rank<old.rank:card.rank===old.rank;s.last={card,old,ok,at:s.position};if(ok){s.discard.push(card);s.position++;if(s.checkpoints.includes(s.position))s.checkpoint=Math.max(s.checkpoint,s.position);s.done=s.position===s.road.length}else{s.points++;s.discard.push(old);s.road[s.position]=card;s.position=s.checkpoint}s.phase='result';return ok}
function next(s){if(s.phase==='result'&&!s.done){s.phase='reveal';s.choice=null;s.last=null}}
const api={create,reveal,choose,draw,next};if(typeof module!=='undefined')module.exports=api;root.Bus=api;
})(globalThis);
