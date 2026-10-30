// Requires Node.js 22+ and Chromium running with --remote-debugging-port=9222.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const baseURL=process.env.BUS_QA_URL||'http://127.0.0.1:8000/index.html';
(async()=>{
const tabs=await (await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const calls=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=calls.get(m.id);calls.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)};
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;calls.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await wait(80)}throw Error('Timed out '+expression)};
await call('Runtime.enable');await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await call('Page.navigate',{url:baseURL});await until("!!document.querySelector('#app button')");
await evaluate("localStorage.clear();location.reload()");await wait(400);await until("!!document.querySelector('#start')");
await evaluate("document.querySelector('#start').click()");
await until("!!document.querySelector('.route-card.current')");
assert.equal(await evaluate('match.names.length'),2);
assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true,'No horizontal page overflow');
const screenshot=async name=>{if(!process.env.BUS_QA_SCREENSHOTS)return;fs.mkdirSync(process.env.BUS_QA_SCREENSHOTS,{recursive:true});const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(process.env.BUS_QA_SCREENSHOTS,name+'.png'),Buffer.from(r.data,'base64'))};
await screenshot('bus-mobile');
// Deterministic draw while preserving the actual deck; clicking twice must not draw twice.
await evaluate("match.state.road[0]={rank:5,suit:'♠'};match.state.deck.push({rank:14,suit:'♥'});render();document.querySelector('.route-card.current').click();document.querySelector('.route-card.current').click()");
await until("document.querySelector('#prediction').open && !busy");
assert.equal(await evaluate("document.querySelector('#choice-reference').innerText.includes('5')"),true);
await screenshot('bus-choice-mobile');
const visibleReference=await evaluate(`(()=>{const a=document.querySelector('.route-card.current').getBoundingClientRect(),b=document.querySelector('#prediction').getBoundingClientRect();return a.bottom<=b.top&&a.top>=0&&b.bottom<=innerHeight})()`);
assert.equal(visibleReference,true,'Choice window never masks the active reference');
assert.equal(await evaluate("sipsLabel(1)"),'1 gorgée');assert.equal(await evaluate('sipsLabel(3)'),'3 gorgées');
assert.equal(await evaluate("/\\bpoints?\\b/i.test(document.body.innerText)"),false,'No old vocabulary in interface');
await evaluate("document.querySelector('[data-choice=plus]').click();document.querySelector('[data-choice=moins]').click()");
await until("document.querySelector('#result-window').open&&document.querySelector('#result-heading').textContent==='Bien joué !'");
assert.equal(await evaluate(`(()=>{const a=document.querySelector('.route-card.current').getBoundingClientRect(),b=document.querySelector('#result-window').getBoundingClientRect();return a.bottom<=b.top&&b.bottom<=innerHeight})()`),true,'Result keeps reference visible');
await screenshot('bus-result-mobile');
await until('!busy && match.turns===1');
assert.equal(await evaluate('match.turn'),1);assert.equal(await evaluate('match.state.position'),1);assert.equal(await evaluate('match.state.road[0].rank'),14);
assert.equal(await evaluate("document.querySelector('#prediction').open"),false);
// Third card after checkpoint costs 3 and rotates team, not a new road.
await evaluate("match.state.position=4;match.state.checkpoint=2;match.state.road[4]={rank:6,suit:'♠'};match.state.seen[4]=true;match.state.deck.push({rank:14,suit:'♦'});render();document.querySelector('.route-card.current').click()");
await until("document.querySelector('#prediction').open&&!busy");
await evaluate("document.querySelector('[data-choice=moins]').click()");await until('!busy&&match.turns===2');
assert.equal(await evaluate('match.turn'),0);assert.equal(await evaluate('match.state.points'),3);assert.equal(await evaluate('match.state.position'),2);assert.equal(await evaluate('match.state.checkpoint'),2);assert.equal(await evaluate('match.state.road[4].rank'),14);
// A touch on an already visible active card opens choices without another reveal.
await evaluate("match.state.seen[2]=true;render();document.querySelector('.route-card.current').scrollIntoView({block:'center'})");
const touch=await evaluate("(()=>{const r=document.querySelector('.route-card.current').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await until("document.querySelector('#prediction').open&&!busy");
await evaluate("document.querySelector('#choiceClose').click()");
// Save/reload keeps shared score and active teammate.
await evaluate('location.reload()');await wait(300);await until('typeof match!=="undefined"&&match?.turns===2');
assert.equal(await evaluate('match.state.points'),3);
// Result recovery cannot repeat the draw or rotate twice; team arrival is final.
await evaluate("match.state.position=match.state.road.length-1;match.state.road[match.state.position]={rank:2,suit:'♠'};match.state.phase='reveal';Bus.reveal(match.state);match.state.deck.push({rank:14,suit:'♥'});Team.predict(match,'plus');save();location.reload()");
await until('typeof match!=="undefined"&&match?.finished===true');
assert.equal(await evaluate('match.turns'),3);
assert.equal(await evaluate("document.querySelector('.final-sips').textContent.includes('3')"),true);
await evaluate("document.querySelector('#replay').click()");
assert.equal(await evaluate('match.turns'),0);
assert.equal(await evaluate('match.state.points'),0);
// Reduced motion still resolves the turn and hands off automatically.
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await evaluate("match.state.road[0]={rank:2,suit:'♠'};match.state.deck.push({rank:14,suit:'♥'});render();document.querySelector('.route-card.current').click()");
await until("document.querySelector('#prediction').open&&!busy");await evaluate("document.querySelector('[data-choice=plus]').click()");await until('!busy&&match.turns===1');
assert.equal(await evaluate('match.turn'),1);
await call('Emulation.setEmulatedMedia',{features:[]});
// Layout extremes at mobile widths, all cards around center and tappable.
for(const width of [320,360,390,650,1024]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<651});
 for(const length of [3,8,20]){
  await evaluate(`match=Team.create(['Alice','Bob'],${length},[2]);render()`);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`No overflow ${width}/${length}`);
  assert.equal(await evaluate("document.querySelector('.team-arena')===null"),true,'No permanent central panel');
  const overlap=await evaluate(`(()=>{const cards=[...document.querySelectorAll('.route-card')].map(e=>e.getBoundingClientRect());return cards.some((a,i)=>cards.some((b,j)=>i!==j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))})()`);
  assert.equal(overlap,false,`No overlapping cards ${width}/${length}`);
  assert.ok(await evaluate("document.querySelector('.route-card').getBoundingClientRect().width")>=68,'Large mobile cards');
  assert.equal(await evaluate("document.querySelectorAll('.route-card').length"),length);
 }
}
// Small phone heights: last active card stays visible above the temporary window.
for(const height of [568,667]){
 await call('Emulation.setDeviceMetricsOverride',{width:320,height,deviceScaleFactor:1,mobile:true});
 await evaluate("match=Team.create(['Alice','Bob','Camille'],20,[3,8,14]);match.state.position=19;match.state.seen[19]=true;render();document.querySelector('.route-card.current').click()");
 await until("document.querySelector('#prediction').open&&!busy");
 assert.equal(await evaluate(`(()=>{const a=document.querySelector('.route-card.current').getBoundingClientRect(),b=document.querySelector('#prediction').getBoundingClientRect();return a.bottom<=b.top&&a.top>=0&&b.bottom<=innerHeight})()`),true,`Reference/window visible at 320x${height}`);
 await evaluate("document.querySelector('#choiceClose').click()");
}
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate("match=Team.create(['Alice','Bob','Camille'],20,[3,8,14]);render()");await screenshot('bus-mobile-20');
await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await evaluate('render()');await screenshot('bus-desktop');
assert.deepEqual(errors,[],'No JavaScript exceptions');
console.log('Browser QA OK: local application, mobile touch, automatic draw, double-click lock, shared score/checkpoint/rotation, reload recovery, team arrival, replay, reduced motion and 15 layout combinations (320–1024 px, 3–20 cards).');
ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
