const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let previousRules = false;
let config={names:['Joueur 1','Joueur 2'],length:8,checkpoints:[3,6]},match=null;try{let saved=JSON.parse(localStorage.getItem('lebus-team-v3'));if(saved){config=saved.config;match=saved.match}else{const legacy=JSON.parse(localStorage.getItem('lebus-v2')||localStorage.getItem('lebus-v1'));if(legacy){config=legacy.config;previousRules=!!legacy.match}}}catch{}
function save(){try{localStorage.setItem('lebus-team-v3',JSON.stringify({config,match}))}catch{}}
function setup(){match=null;render()}
function renderSetup(){ $('#app').innerHTML=`<div class="panel-head"><div><span class="step">01 / AVANT LE DÉPART</span><h2>Préparez le voyage.</h2></div><span class="muted">À partir de 1 joueur</span></div>${previousRules?'<p class="notice" role="status">Place au jeu en équipe ! Votre équipe et votre trajet sont conservés. Commencez une nouvelle autoroute avec un score commun.</p>':''}<div class="setup-grid"><div><h3>Qui monte à bord ?</h3><p class="muted">Une seule équipe, une seule autoroute. Une prédiction par personne, chacun son tour.</p><div id="names">${config.names.map((n,i)=>`<div class="player-input"><input aria-label="Nom du joueur ${i+1}" maxlength="24" value="${esc(n)}" data-name="${i}">${config.names.length>1?`<button class="remove" data-i="${i}" aria-label="Retirer le joueur ${i+1}">×</button>`:''}</div>`).join('')}</div><button class="quiet" id="add" style="margin-top:12px" ${config.names.length>=12?'disabled':''}>+ Ajouter un joueur</button></div><div><h3>Tracez votre autoroute.</h3><label class="field">Longueur <b id="lengthLabel">${config.length} cartes</b><input id="length" type="range" min="3" max="20" value="${config.length}"></label><label>Checkpoints</label><p class="muted">Touchez les étapes à sécuriser. Aucun ? Le défi est total.</p><div class="checkpoints">${Array.from({length:config.length-1},(_,i)=>`<button class="checkpoint ${config.checkpoints.includes(i+1)?'selected':''}" aria-pressed="${config.checkpoints.includes(i+1)}" data-cp="${i+1}">${i+1}</button>`).join('')}</div><div class="notice">⚑ Un checkpoint se gagne en franchissant sa carte.<br>Il reste acquis jusqu’à la fin du passage.</div></div></div><div class="start-row"><span class="muted">52 cartes · As le plus fort · Un score pour toute l’équipe</span><button id="start" class="primary">C’est parti &nbsp; →</button></div><p id="error" class="error" role="alert"></p>`;
 document.querySelectorAll('[data-name]').forEach(el=>el.oninput=()=>{config.names[+el.dataset.name]=el.value;save()});document.querySelectorAll('.remove').forEach(el=>el.onclick=()=>{config.names.splice(+el.dataset.i,1);renderSetup();save()});$('#add').onclick=()=>{config.names.push('Joueur '+(config.names.length+1));renderSetup();save()};$('#length').oninput=e=>{config.length=+e.target.value;config.checkpoints=config.checkpoints.filter(x=>x<config.length);$('#lengthLabel').textContent=config.length+' cartes'};$('#length').onchange=()=>{renderSetup();save()};document.querySelectorAll('[data-cp]').forEach(el=>el.onclick=()=>{let n=+el.dataset.cp;config.checkpoints=config.checkpoints.includes(n)?config.checkpoints.filter(x=>x!==n):[...config.checkpoints,n].sort((a,b)=>a-b);renderSetup();save()});$('#start').onclick=()=>{config.names=config.names.map(x=>x.trim());if(config.names.some(x=>!x)){$('#error').textContent='Donnez un nom à chaque joueur.';return}previousRules=false;match=Team.create(config.names,config.length,config.checkpoints);save();render()}}

const rank = r => ({14:'A',13:'R',12:'D',11:'V'}[r] || r);
const cardName = c => `${rank(c.rank)} ${c.suit}`;
const pointsLabel = n => `${n} point${n > 1 ? 's' : ''}`;
const compact = () => window.matchMedia('(max-width: 650px)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let busy = false;
function card(c) {
  return c ? `<div class="card ${['♥','♦'].includes(c.suit)?'red':''}" aria-label="${cardName(c)}"><span class="corner">${rank(c.rank)}<br>${c.suit}</span><span class="suit">${c.suit}</span><span class="corner bottom" aria-hidden="true">${rank(c.rank)}<br>${c.suit}</span></div>` : '<div class="card hidden" aria-label="Carte cachée"><img src="assets/logo.svg" alt=""></div>';
}
function outcome(s) {
  if (!s.last.ok) return `+${pointsLabel(s.last.penalty)} · ${s.last.penalty} carte${s.last.penalty>1?'s':''} depuis ${s.last.fromCheckpoint?'le checkpoint '+s.last.fromCheckpoint:'le départ'}. Retour ${s.checkpoint?'après l’étape '+s.checkpoint:'au départ'}.`;
  return s.done ? 'Toute l’équipe est arrivée !' : s.last.checkpointReached ? `Checkpoint ${s.checkpoint} sécurisé pour toute l’équipe !` : 'Bonne réponse ! L’équipe avance d’une carte.';
}
function render() {
  document.body.classList.toggle('playing', !!match && !match.finished);
  if (!match) return renderSetup();
  if (match.finished) return finish();
  const s=match.state, layout=Layout.route(s.road.length,compact());
  const reference=s.seen[s.position]?s.road[s.position]:null;
  $('#app').innerHTML=`
    <div class="panel-head"><div><span class="step">UNE ÉQUIPE · UN SEUL VOYAGE</span><h2 id="turn-name" tabindex="-1">À toi, ${esc(match.names[match.turn])}.</h2></div><div class="ticket"><strong>${pointsLabel(s.points)}</strong><span>Score de l’équipe</span></div></div>
    <div class="crew" aria-label="Ordre des joueurs">${match.names.map((name,i)=>`<span class="crew-member ${i===match.turn?'on-turn':''}" ${i===match.turn?'aria-current="true"':''}>${i===match.turn?'● ':''}${esc(name)}</span>`).join('<span class="crew-arrow" aria-hidden="true">→</span>')}</div>
    <div class="journey-meta"><span>TOUR ${match.turns+1} · ⚑ ${s.checkpoint?'CHECKPOINT '+s.checkpoint:'DÉPART'}</span><span id="progress-label">${s.position} / ${s.road.length}</span></div>
    <div class="progress-track" role="progressbar" aria-label="Progression de l’équipe" aria-valuemin="0" aria-valuemax="${s.road.length}" aria-valuenow="${s.position}"><span style="width:${s.position/s.road.length*100}%"></span></div>
    <div class="route-board" style="--cols:${layout.columns};--rows:${layout.rows}">
      ${s.road.map((c,i)=>{
        const cell=layout.cells[i],active=i===s.position,cp=s.checkpoints.includes(i+1),secured=cp&&i<s.checkpoint;
        return `<div class="route-stop" data-stop="${i}" style="grid-column:${cell.col};grid-row:${cell.row}"><span class="route-tag">${i===0?'DÉPART':i===s.road.length-1?'ARRIVÉE':cp?'⚑ CHECK':'&nbsp;'}</span><button class="route-card ${active?'current':''} ${secured?'secured':''} ${s.seen[i]?'face-up':''}" ${active?'aria-current="step"':'disabled'} aria-label="Étape ${i+1}${i===0?', départ':''}${i===s.road.length-1?', arrivée':''}${cp?', checkpoint'+(secured?' acquis':''):''}${active?', carte active : '+(s.seen[i]?cardName(c)+', choisir une prédiction':'retourner la carte'):''}">${s.seen[i]?`<span class="route-value ${['♥','♦'].includes(c.suit)?'red':''}">${rank(c.rank)}<br>${c.suit}</span>`:'<img src="assets/logo.svg" alt="">'}</button><small><b>${String(i+1).padStart(2,'0')}</b> ${secured?'✓':cell.direction}${active?' ●':''}</small></div>`;
      }).join('')}
      <section class="arena team-arena" aria-label="Panneau central de jeu">
        <span class="step">ÉTAPE ${s.position+1}</span><h3 id="game-heading">${reference?'La route vous attend.':'Retournez la carte active.'}</h3>
        <div class="cards"><div id="bus-slot">${card(reference)}<small>Référence du bus</small></div><div id="draw-slot">${card(null)}<small>Croupier</small></div></div>
        <div class="status" role="status" aria-live="polite" id="game-status">${esc(match.names[match.turn])}, touchez la carte ${s.position+1} sur le parcours.</div>
        <p class="comparison" id="risk">En cas d’erreur : <strong>+${pointsLabel(s.position-s.checkpoint+1)}</strong></p>
        <p class="deck-count">${s.deck.length} en pioche · ${s.discard.length} en défausse</p>
      </section>
    </div>
    <div class="table-bottom"><span class="muted">↻ Suivez les numéros · ⚑ Checkpoint · ● Position actuelle</span><button id="reset" class="quiet">Nouvelle partie</button></div>`;
  $('.route-card.current').onclick=openChoice;
  $('#reset').onclick=reset;
}
function setBusy(value) {
  busy=value;
  $('#app').setAttribute('aria-busy',String(value));
  const active=$('.route-card.current');if(active)active.disabled=value;
  const resetButton=$('#reset');if(resetButton)resetButton.disabled=value;
  document.querySelectorAll('[data-choice]').forEach(el=>el.disabled=value);
}
async function animate(el,frames,duration=320) {
  if (!el || reduced() || !el.animate) return;
  await el.animate(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)'}).finished;
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function flip(el,update) {
  await animate(el,[{transform:'perspective(600px) rotateY(0deg)'},{transform:'perspective(600px) rotateY(90deg)'}],160);
  update();
  await animate(el,[{transform:'perspective(600px) rotateY(-90deg)'},{transform:'perspective(600px) rotateY(0deg)'}],220);
}
async function openChoice() {
  if(busy||!match||match.finished||!['reveal','choose'].includes(match.state.phase))return;
  setBusy(true);
  try {
    const s=match.state,hidden=!s.seen[s.position];
    Bus.reveal(s);save();
    if(hidden)await flip($('.route-card.current'),()=>{
      const c=s.road[s.position];
      $('.route-card.current').innerHTML=`<span class="route-value ${['♥','♦'].includes(c.suit)?'red':''}">${rank(c.rank)}<br>${c.suit}</span>`;
      $('.route-card.current').classList.add('face-up');
    });
    $('#bus-slot .card').outerHTML=card(s.road[s.position]);
    $('#choice-reference').innerHTML=card(s.road[s.position]);
    $('#choice-player').textContent=match.names[match.turn];
    $('#choice-risk').textContent=`Erreur ici : +${pointsLabel(s.position-s.checkpoint+1)} pour l’équipe.`;
    $('#prediction').showModal();
  } catch(error) {console.error(error);render();}
  finally {setBusy(false);}
}
async function replaceActive(last) {
  const source=$('#draw-slot .card'),target=$(`[data-stop="${last.at}"] .route-card`);
  const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();
  const flying=source.cloneNode(true);flying.classList.add('flying-card');flying.setAttribute('aria-hidden','true');
  Object.assign(flying.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
  document.body.appendChild(flying);
  try {
    await animate(flying,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:1}],550);
    target.innerHTML=`<span class="route-value ${['♥','♦'].includes(last.card.suit)?'red':''}">${rank(last.card.rank)}<br>${last.card.suit}</span>`;
    target.classList.add('face-up');
    $('#bus-slot .card').outerHTML=card(last.card);
    $('#bus-slot small').textContent='Nouvelle référence';
    await animate(target,[{boxShadow:'0 0 0 10px #bd72c570',transform:'scale(1.08)'},{boxShadow:'0 0 0 0px #bd72c500',transform:'scale(1)'}]);
  } finally {flying.remove();}
}
async function predict(choice) {
  if(busy||!match||match.state.phase!=='choose')return;
  setBusy(true);
  $('#prediction').close();
  try {
    if(!Team.predict(match,choice))return;
    save(); // A reload can finish this result without drawing a second card.
    const s=match.state,last=s.last;
    $('.team-arena').scrollIntoView({block:'center',behavior:'instant'});
    $('#game-heading').textContent='Le croupier tire…';
    $('#game-status').textContent=`${match.names[match.turn]} a choisi ${choice==='plus'?'Plus ↑':choice==='moins'?'Moins ↓':'Égal ='}.`;
    await animate($('#draw-slot .card'),[{transform:'translateY(-25px) rotate(-10deg)',opacity:0},{transform:'translateY(0) rotate(0)',opacity:1}],350);
    await flip($('#draw-slot .card'),()=>{
      const el=$('#draw-slot .card');
      // Keep the element during the flip, replacing only its face.
      const holder=document.createElement('div');holder.innerHTML=card(last.card);
      el.className=holder.firstElementChild.className;el.innerHTML=holder.firstElementChild.innerHTML;el.setAttribute('aria-label',cardName(last.card));
    });
    $('#game-heading').textContent=last.ok?'Bien joué !':`+${pointsLabel(last.penalty)} pour l’équipe`;
    $('#game-status').textContent=outcome(s);
    $('#risk').textContent=`${cardName(last.old)} → ${cardName(last.card)}`;
    await pause(reduced()?900:1150);
    await replaceActive(last);
    // The saved engine already holds the result; only now show movement and handoff.
    const checkpoint=last.checkpointReached;
    Team.advance(match);save();render();setBusy(true);
    await animate($('.progress-track span'),[{width:`${last.at/s.road.length*100}%`},{width:`${s.position/s.road.length*100}%`}],350);
    if(checkpoint)await animate($(`[data-stop="${s.checkpoint-1}"]`),[{transform:'scale(1)'},{transform:'scale(1.15)',filter:'brightness(1.2)'},{transform:'scale(1)'}],500);
    await animate($('.route-card.current'),[{transform:'translateY(-7px)',boxShadow:'0 0 0 8px #bd72c544'},{transform:'translateY(0)',boxShadow:'0 0 0 0 #bd72c500'}],400);
    $('.route-card.current')?.scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'});
    $('#turn-name')?.focus({preventScroll:true});
  } catch(error) {
    console.error('Animation interrompue',error);
    if(match?.state.phase==='result'){Team.advance(match);save();}
    render();
  } finally {setBusy(false);}
}
function reset(){if(busy)return;if(confirm('Quitter cette partie et remettre le score commun à zéro ?')){match=null;render();save();}}
function finish(){
  $('#app').innerHTML=`<div class="finish-screen"><span class="step">TERMINUS · TOUTE L’ÉQUIPE EST ARRIVÉE</span><h2>Un voyage, une victoire.</h2><div class="final-points">${match.state.points}<small>points d’équipe</small></div><p>${match.names.map(esc).join(' · ')}</p><p class="muted">${match.turns} prédictions ensemble · ${match.state.road.length} cartes franchies</p><p>Le défi : terminer avec encore moins de points.</p><div class="actions"><button id="replay">Rejouer en équipe →</button><button id="settings" class="quiet">Modifier le voyage</button></div></div>`;
  $('#replay').onclick=()=>{if(busy)return;match=Team.create(config.names,config.length,config.checkpoints);save();render();};
  $('#settings').onclick=()=>{if(busy)return;match=null;save();render();};
}
$('#rulesOpen').onclick=()=>$('#rules').showModal();
$('#rulesClose').onclick=()=>$('#rules').close();
$('#choiceClose').onclick=()=>$('#prediction').close();
document.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>predict(el.dataset.choice));
let lastCompact=compact();
window.addEventListener('resize',()=>{const nextCompact=compact();if(!busy&&nextCompact!==lastCompact){lastCompact=nextCompact;render();}});
if(match?.state.phase==='result'){Team.advance(match);save();}
render();
