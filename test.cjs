const assert=require('node:assert/strict'),B=require('./engine.js');
const c=r=>({rank:r,suit:'♠'});
function state(){let s=B.create(4,[2]);s.road=[c(5),c(6),c(7),c(8)];return s}
function turn(s,choice,rank){B.reveal(s);B.choose(s,choice);s.deck.push(c(rank));B.draw(s)}
let s=state();turn(s,'plus',14);assert.equal(s.position,1);assert.equal(s.points,0);B.next(s);turn(s,'egal',6);assert.equal(s.checkpoint,2);B.next(s);turn(s,'moins',14);assert.equal(s.points,1);assert.equal(s.position,2);assert.equal(s.checkpoint,2);assert.equal(s.road[2].rank,14);let pts=s.points;B.draw(s);assert.equal(s.points,pts);B.next(s);turn(s,'moins',13);B.next(s);turn(s,'egal',8);assert.equal(s.done,true);assert.equal(s.position,4);
s=state();turn(s,'plus',5);assert.equal(s.position,0);assert.equal(s.points,1);assert.equal(s.last.ok,false);
s=state();s.road[0]=c(14);turn(s,'moins',13);assert.equal(s.last.ok,true);
s=state();s.deck=[];s.discard=[c(2)];B.reveal(s);B.choose(s,'moins');B.draw(s);assert.equal(s.last.card.rank,2);assert.equal(s.last.ok,true);
for(let k=0;k<100;k++){s=B.create(20,[4,10]);let turns=0;while(!s.done&&turns++<10000){B.reveal(s);let r=s.road[s.position].rank;B.choose(s,r<8?'plus':'moins');B.draw(s);assert.equal(s.road.length+s.deck.length+s.discard.length,52);let all=[...s.road,...s.deck,...s.discard].map(c=>c.rank+c.suit);assert.equal(new Set(all).size,52);if(!s.done)B.next(s)}assert.ok(s.done)}
console.log('OK : As fort, égalité, erreur, remplacement, checkpoint persistant, arrivée, double tirage bloqué, recyclage et conservation des 52 cartes sur 100 parties.');
