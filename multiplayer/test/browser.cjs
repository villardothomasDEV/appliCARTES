const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin=process.env.BUS_MP_QA_URL||'http://127.0.0.1:8080';
async function connect(url){const ws=new WebSocket(url);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map(),errors=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)};const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});const evalJS=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};return {call,evalJS,errors,close:()=>ws.close()};}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(client,expression){for(let i=0;i<150;i++){if(await client.evalJS(expression))return;await delay(100)}throw Error('Timed out '+expression)}
(async()=>{
const info=await(await fetch('http://127.0.0.1:9222/json/version')).json(),browser=await connect(info.webSocketDebuggerUrl),clients=[],contexts=[];
for(const width of [390,360,320]){const ctx=await browser.call('Target.createBrowserContext');contexts.push(ctx.browserContextId);const {targetId}=await browser.call('Target.createTarget',{url:'about:blank',browserContextId:ctx.browserContextId});const list=await(await fetch('http://127.0.0.1:9222/json')).json();const c=await connect(list.find(t=>t.id===targetId).webSocketDebuggerUrl);await c.call('Runtime.enable');await c.call('Page.enable');await c.call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});clients.push(c);}
const [alice,bob,camille]=clients;
await alice.call('Page.navigate',{url:origin+'/multiplayer/'});await until(alice,"!!document.querySelector('#create-form')");await alice.evalJS("document.querySelector('#create-form input').value='Alice';document.querySelector('#create-form').requestSubmit()");await until(alice,"typeof room!=='undefined'&&room?.status==='lobby'&&!busy");const code=await alice.evalJS('room.code');
for(const [client,name] of [[bob,'Bob'],[camille,'Camille']]){await client.call('Page.navigate',{url:origin+'/multiplayer/?room='+code});await until(client,"!!document.querySelector('#join-form')");await client.evalJS(`document.querySelector('#join-form [name=name]').value='${name}';document.querySelector('#join-form').requestSubmit()`);await until(client,"typeof room!=='undefined'&&room?.status==='lobby'&&!busy");}
await until(alice,'room.players.length===3');assert.equal(await bob.evalJS("document.querySelector('#start')===null"),true);
await alice.evalJS("document.querySelector('#start').click()");for(const c of clients)await until(c,"room?.status==='playing'");
assert.equal(await alice.evalJS('room.state.road.every(c=>c===null)'),true);
assert.equal(await bob.evalJS('[...document.querySelectorAll("[data-card]")].every(b=>b.disabled)'),true);
const denied=await bob.evalJS(`fetch('/api/rooms/${code}/actions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({type:'reveal',turnId:room.turnId,requestId:crypto.randomUUID()})}).then(r=>r.status)`);assert.equal(denied,403);
const ids=await Promise.all(clients.map(c=>c.evalJS('room.me')));
for(let attempt=0;attempt<3;attempt++){
 const actor=clients[attempt];await until(actor,`room.activeId==='${ids[attempt]}'&&room.status==='playing'`);
 await actor.evalJS("document.querySelector('[data-card].current').click();document.querySelector('[data-card].current').click()");await until(actor,"document.querySelector('#mp-choice').open&&!busy");
 for(const c of clients)await until(c,"room.state.phase==='choose'");
 for(let i=0;i<3;i++)if(i!==attempt)assert.equal(await clients[i].evalJS("document.querySelector('#mp-choice').open"),false);
 await actor.evalJS("document.querySelector('[data-predict=egal]').click();document.querySelector('[data-predict=plus]').click()");
 for(const c of clients)await until(c,"room.status==='result'");
 const states=await Promise.all(clients.map(c=>c.evalJS('JSON.stringify(room.state)')));assert.equal(new Set(states).size,1);
 if(process.env.BUS_QA_SCREENSHOTS&&attempt===0){fs.mkdirSync(process.env.BUS_QA_SCREENSHOTS,{recursive:true});for(let i=0;i<3;i++){const r=await clients[i].call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(process.env.BUS_QA_SCREENSHOTS,'session-'+i+'.png'),Buffer.from(r.data,'base64'));}}
 for(const c of clients)await until(c,`room.status==='playing'&&room.turns===${attempt+1}`);
 assert.equal(await alice.evalJS('room.activeId'),ids[(attempt+1)%3]);
}
await bob.call('Page.reload');await until(bob,`typeof room!=='undefined'&&room?.me==='${ids[1]}'`);assert.equal(await bob.evalJS('room.players.length'),3);
for(const c of clients){assert.equal(await c.evalJS('document.documentElement.scrollWidth<=innerWidth'),true);assert.deepEqual(c.errors,[]);}
// Returning from a temporary network outage keeps the same identity.
await bob.call('Network.enable');await bob.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await delay(1500);await bob.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await until(bob,'online===true');assert.equal(await bob.evalJS('room.me'),ids[1]);
for(const c of clients)c.close();for(const id of contexts)await browser.call('Target.disposeBrowserContext',{browserContextId:id});browser.close();console.log('OK : 3 navigateurs indépendants (320/360/390 px), lobby, restrictions serveur et client, cartes cachées, 3 tours synchronisés, double clic, actualisation et coupure temporaire.');
})().catch(error=>{console.error(error);process.exit(1)});
