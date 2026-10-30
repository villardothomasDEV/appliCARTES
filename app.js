const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let previousRules = false;
let config={names:['Joueur 1','Joueur 2'],length:8,checkpoints:[3,6]},match=null;try{let saved=JSON.parse(localStorage.getItem('lebus-v2'));if(saved){config=saved.config;match=saved.match}else{const legacy=JSON.parse(localStorage.getItem('lebus-v1'));if(legacy){config=legacy.config;previousRules=!!legacy.match}}}catch{}
function save(){try{localStorage.setItem('lebus-v2',JSON.stringify({config,match}))}catch{}}
function setup(){match=null;render()}
function renderSetup(){ $('#app').innerHTML=`<div class="panel-head"><div><span class="step">01 / AVANT LE DÉPART</span><h2>Préparez le voyage.</h2></div><span class="muted">À partir de 1 joueur</span></div>${previousRules?'<p class="notice" role="status">Les règles ont changé : votre ancienne partie ne peut pas être reprise. Votre équipe et votre trajet sont conservés ; les nouveaux scores repartent de zéro.</p>':''}<div class="setup-grid"><div><h3>Qui monte à bord ?</h3><p class="muted">Le croupier fait jouer chaque personne à son tour.</p><div id="names">${config.names.map((n,i)=>`<div class="player-input"><input aria-label="Nom du joueur ${i+1}" maxlength="24" value="${esc(n)}" data-name="${i}">${config.names.length>1?`<button class="remove" data-i="${i}" aria-label="Retirer le joueur ${i+1}">×</button>`:''}</div>`).join('')}</div><button class="quiet" id="add" style="margin-top:12px" ${config.names.length>=12?'disabled':''}>+ Ajouter un joueur</button></div><div><h3>Tracez votre autoroute.</h3><label class="field">Longueur <b id="lengthLabel">${config.length} cartes</b><input id="length" type="range" min="3" max="20" value="${config.length}"></label><label>Checkpoints</label><p class="muted">Touchez les étapes à sécuriser. Aucun ? Le défi est total.</p><div class="checkpoints">${Array.from({length:config.length-1},(_,i)=>`<button class="checkpoint ${config.checkpoints.includes(i+1)?'selected':''}" aria-pressed="${config.checkpoints.includes(i+1)}" data-cp="${i+1}">${i+1}</button>`).join('')}</div><div class="notice">⚑ Un checkpoint se gagne en franchissant sa carte.<br>Il reste acquis jusqu’à la fin du passage.</div></div></div><div class="start-row"><span class="muted">52 cartes · As le plus fort · Le moins de points gagne</span><button id="start" class="primary">C’est parti &nbsp; →</button></div><p id="error" class="error" role="alert"></p>`;
 document.querySelectorAll('[data-name]').forEach(el=>el.oninput=()=>{config.names[+el.dataset.name]=el.value;save()});document.querySelectorAll('.remove').forEach(el=>el.onclick=()=>{config.names.splice(+el.dataset.i,1);renderSetup();save()});$('#add').onclick=()=>{config.names.push('Joueur '+(config.names.length+1));renderSetup();save()};$('#length').oninput=e=>{config.length=+e.target.value;config.checkpoints=config.checkpoints.filter(x=>x<config.length);$('#lengthLabel').textContent=config.length+' cartes'};$('#length').onchange=()=>{renderSetup();save()};document.querySelectorAll('[data-cp]').forEach(el=>el.onclick=()=>{let n=+el.dataset.cp;config.checkpoints=config.checkpoints.includes(n)?config.checkpoints.filter(x=>x!==n):[...config.checkpoints,n].sort((a,b)=>a-b);renderSetup();save()});$('#start').onclick=()=>{config.names=config.names.map(x=>x.trim());if(config.names.some(x=>!x)){$('#error').textContent='Donnez un nom à chaque joueur.';return}previousRules=false;match={player:0,scores:[],state:Bus.create(config.length,config.checkpoints),finished:false};save();render()}}
const rank = r => ({ 14: 'A', 13: 'R', 12: 'D', 11: 'V' }[r] || r);
const cardName = c => `${rank(c.rank)} ${c.suit}`;
const pointsLabel = n => `${n} point${n > 1 ? 's' : ''}`;
const motionReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let busy = false;

function card(c) {
  return c ? `<div class="card ${['♥', '♦'].includes(c.suit) ? 'red' : ''}" aria-label="${cardName(c)}"><span class="corner">${rank(c.rank)}<br>${c.suit}</span><span class="suit">${c.suit}</span><span class="corner bottom" aria-hidden="true">${rank(c.rank)}<br>${c.suit}</span></div>`
    : '<div class="card hidden" aria-label="Carte cachée"><img src="assets/logo.svg" alt=""></div>';
}

function outcome(s) {
  const last = s.last;
  if (!last.ok) return `+${pointsLabel(last.penalty)} : ${last.penalty} carte${last.penalty > 1 ? 's' : ''} depuis ${last.fromCheckpoint ? 'le checkpoint ' + last.fromCheckpoint : 'le départ'}. Retour ${s.checkpoint ? 'après l’étape ' + s.checkpoint : 'au départ'}.`;
  if (s.done) return `Passage terminé avec ${pointsLabel(s.points)}.`;
  return last.checkpointReached ? `Checkpoint ${s.checkpoint} sécurisé !` : 'Une étape de franchie. Continuez comme ça !';
}

function render(effect) {
  document.body.classList.toggle('playing', !!match && !match.finished);
  if (!match) { renderSetup(); return; }
  if (match.finished) { finish(); return; }
  const s = match.state, n = config.names[match.player], result = s.phase === 'result';
  const animatedDraw = result && effect === 'draw';
  const risk = s.position - s.checkpoint + 1;
  $('#app').innerHTML = `
    <div class="panel-head">
      <div><span class="step">PASSAGE ${match.player + 1} / ${config.names.length}</span><h2>Au tour de ${esc(n)}.</h2></div>
      <div class="ticket"><strong>${pointsLabel(s.points)}</strong><span>⚑ ${s.checkpoint ? 'Checkpoint ' + s.checkpoint : 'Départ'}</span></div>
    </div>
    <div class="journey-meta"><span>VOTRE AUTOROUTE</span><span>${s.position} / ${config.length} cartes franchies</span></div>
    <div class="progress-track" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="${config.length}" aria-valuenow="${s.position}"><span style="width:${s.position / config.length * 100}%"></span></div>
    <div class="road" aria-label="Autoroute">${s.road.map((c, i) => {
      const shown = animatedDraw && i === s.last.at ? s.last.old : c;
      const cp = config.checkpoints.includes(i + 1), secured = cp && i < s.checkpoint;
      return `<div class="road-stop" data-stop="${i}"><div class="mini ${i === s.position ? 'current' : ''} ${i < s.position ? 'crossed' : ''} ${secured ? 'secured' : ''}" ${i === s.position ? 'aria-current="step"' : ''}>${s.seen[i] ? cardName(shown) : '<img src="assets/logo.svg" alt="Carte cachée">'}</div><small class="${secured ? 'secured-label' : ''}">${i + 1} ${cp ? '⚑' : ''}${secured ? ' ✓' : ''}</small></div>`;
    }).join('')}</div>
    <div class="arena ${result ? s.last.ok ? 'success' : 'failure' : ''}">
      <span class="step">${s.done ? 'TERMINUS !' : `ÉTAPE ${(result ? s.last.at : s.position) + 1} / ${config.length}`}</span>
      <h3>${s.done ? 'Bien arrivé !' : s.phase === 'reveal' ? 'On retourne la prochaine ?' : s.phase === 'choose' ? 'Quel est votre pronostic ?' : s.phase === 'draw' ? 'Au croupier de tirer.' : s.last.ok ? 'Bien joué, on avance !' : `Oups. +${pointsLabel(s.last.penalty)}.`}</h3>
      <div class="cards"><div id="bus-slot">${card(s.phase === 'reveal' ? null : result ? animatedDraw ? s.last.old : s.last.card : s.road[s.position])}<small>${result && !animatedDraw ? 'Nouvelle carte du bus' : 'Carte du bus'}</small></div><span class="card-link" aria-hidden="true">${result ? '←' : '?'}</span><div id="draw-slot">${card(result && !animatedDraw ? s.last.card : null)}<small>Carte du croupier</small></div></div>
      <div class="status" role="status">${result ? outcome(s) : s.phase === 'draw' ? `Pronostic : ${s.choice === 'plus' ? 'Plus' : s.choice === 'moins' ? 'Moins' : 'Égal'} · À vous, croupier` : '2 → 10 → Valet → Dame → Roi → As'}</div>
      ${result ? `<p class="comparison">${cardName(s.last.old)} → ${cardName(s.last.card)} · La carte tirée remplace celle du bus.</p>` : `<p class="comparison">En cas d’erreur ici : <strong>+${pointsLabel(risk)}</strong> · Retour ${s.checkpoint ? 'au checkpoint ' + s.checkpoint : 'au départ'}</p>`}
      <div class="choices">${s.phase === 'reveal' ? '<button id="reveal" class="primary">Révéler la carte</button>' : s.phase === 'choose' ? '<button data-choice="plus">↑ Plus</button><button data-choice="moins">↓ Moins</button><button data-choice="egal">= Égal</button>' : s.phase === 'draw' ? '<button id="draw" class="primary">Croupier : tirer une carte</button>' : `<button id="next" class="primary">${s.done ? match.player + 1 === config.names.length ? 'Voir le classement' : 'Joueur suivant →' : 'Continuer →'}</button>`}</div>
      <p class="deck-count">${s.deck.length} cartes dans la pioche <span>·</span> ${s.discard.length} dans la défausse</p>
    </div>
    <div class="scoreboard">${config.names.map((name, i) => `<div class="score ${i === match.player ? 'active' : ''}"><b>${i === match.player ? s.points : match.scores[i] ?? '—'}</b>${esc(name)}<small>${i < match.player ? 'Passage terminé' : i === match.player ? 'À bord' : 'En attente'}</small></div>`).join('')}</div>
    <button id="reset" class="quiet">Nouvelle partie</button>`;
  if ($('#reveal')) $('#reveal').onclick = () => act(() => Bus.reveal(s), 'reveal');
  document.querySelectorAll('[data-choice]').forEach(el => el.onclick = () => act(() => Bus.choose(s, el.dataset.choice)));
  if ($('#draw')) $('#draw').onclick = () => act(() => Bus.draw(s), 'draw');
  if ($('#next')) $('#next').onclick = () => act(() => {
    if (s.done) {
      match.scores[match.player] = s.points;
      match.player++;
      if (match.player === config.names.length) match.finished = true;
      else match.state = Bus.create(config.length, config.checkpoints);
    } else Bus.next(s);
  }, 'progress');
  $('#reset').onclick = reset;
  // Scroll only the horizontal road, never the whole page on every action.
  const target = $(`[data-stop="${animatedDraw ? s.last.at : s.position}"]`);
  if (target) {
    const road = $('.road');
    road.scrollLeft = Math.max(0, target.offsetLeft - road.offsetLeft - road.clientWidth / 2 + target.clientWidth / 2);
  }
}

async function animate(el, frames, duration = 360) {
  if (!el || motionReduced() || !el.animate) return;
  await el.animate(frames, { duration, easing: 'cubic-bezier(.2,.75,.25,1)' }).finished;
}

async function turnCard(slot, value) {
  await animate($(slot + ' .card'), [{ transform: 'perspective(700px) rotateY(0deg)' }, { transform: 'perspective(700px) rotateY(90deg)' }], 180);
  $(slot).querySelector('.card').outerHTML = card(value);
  await animate($(slot + ' .card'), [{ transform: 'perspective(700px) rotateY(-90deg)' }, { transform: 'perspective(700px) rotateY(0deg)' }], 240);
}

async function drawEffects() {
  const s = match.state;
  await turnCard('#draw-slot', s.last.card);
  const source = $('#draw-slot .card'), destination = $('#bus-slot .card');
  const from = source.getBoundingClientRect(), to = destination.getBoundingClientRect();
  const flying = source.cloneNode(true);
  flying.classList.add('flying-card');
  flying.setAttribute('aria-hidden', 'true');
  Object.assign(flying.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(flying);
  try {
    await Promise.all([
      animate(flying, [{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) rotate(-6deg)`, offset: .8 }, { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) rotate(0deg)` }], 480),
      animate(destination, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(14px)' }], 480)
    ]);
    destination.outerHTML = card(s.last.card);
    $('#bus-slot small').textContent = 'Nouvelle carte du bus';
    const mini = $(`[data-stop="${s.last.at}"] .mini`);
    mini.textContent = cardName(s.last.card);
    await animate(mini, [{ transform: 'scale(.85)', boxShadow: '0 0 0 8px #bd72c555' }, { transform: 'scale(1)', boxShadow: '0 0 0 0px #bd72c500' }]);
  } finally { flying.remove(); }
  if (s.last.checkpointReached) {
    await animate($(`[data-stop="${s.checkpoint - 1}"]`), [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', filter: 'brightness(1.2)' }, { transform: 'scale(1)' }], 500);
  }
  await animate($('.progress-track span'), [{ width: `${s.last.at / config.length * 100}%` }, { width: `${s.position / config.length * 100}%` }]);
  await animate($('.mini.current'), [{ transform: 'translateY(8px)', opacity: .5 }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)', opacity: 1 }]);
}

async function act(fn, effect) {
  if (busy) return;
  busy = true;
  try {
    if (effect === 'reveal') {
      await animate($('#bus-slot .card'), [{ transform: 'perspective(700px) rotateY(0)' }, { transform: 'perspective(700px) rotateY(90deg)' }], 180);
    }
    fn();
    save();
    render(effect);
    document.querySelectorAll('#app button').forEach(el => el.disabled = true);
    $('#app').setAttribute('aria-busy', 'true');
    if (effect === 'reveal') await animate($('#bus-slot .card'), [{ transform: 'perspective(700px) rotateY(-90deg)' }, { transform: 'perspective(700px) rotateY(0)' }], 260);
    if (effect === 'draw') await drawEffects();
    if (effect === 'progress') await animate($('.mini.current'), [{ transform: 'translateY(10px)', opacity: .3 }, { transform: 'translateY(0)', opacity: 1 }]);
  } catch (error) {
    // Visual effects must never interrupt or roll back a saved game action.
    console.error('Animation interrompue', error);
    render();
  } finally {
    busy = false;
    document.querySelectorAll('#app button').forEach(el => el.disabled = false);
    $('#app').removeAttribute('aria-busy');
  }
}
function reset(){if(busy)return;if(confirm('Quitter cette partie et remettre les scores à zéro ?')){setup();save()}}
function finish(){let rows=config.names.map((name,i)=>({name,score:match.scores[i]})).sort((a,b)=>a.score-b.score);$('#app').innerHTML=`<div class="step">TOUT LE MONDE EST ARRIVÉ</div><h2>Le terminus des champions.</h2><p class="muted">Le moins de points remporte la partie. Bravo ${rows.filter(x=>x.score===rows[0].score).map(x=>esc(x.name)).join(' et ')} !</p>${rows.map((x,i)=>`<div class="rank-row"><span>${rows.findIndex(y=>y.score===x.score)+1}. &nbsp; ${esc(x.name)}</span><b>${x.score} point${x.score>1?'s':''}</b></div>`).join('')}<div class="actions"><button id="replay">Rejouer avec la même équipe →</button><button id="settings" class="quiet">Modifier le voyage</button></div>`;$('#replay').onclick=()=>act(()=>{match={player:0,scores:[],state:Bus.create(config.length,config.checkpoints),finished:false}});$('#settings').onclick=()=>{setup();save()}}
$('#rulesOpen').onclick=()=>$('#rules').showModal();$('#rulesClose').onclick=()=>$('#rules').close();render();
