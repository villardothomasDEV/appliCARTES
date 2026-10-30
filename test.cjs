const { test } = require('node:test');
const assert = require('node:assert/strict');
const Bus = require('./engine.js');
const card = (rank, suit = '♠') => ({ rank, suit });
function fixture(position = 0, checkpoint = 0, checkpoints = [2, 5]) {
  const s = Bus.create(8, checkpoints);
  s.road = [5, 6, 7, 8, 9, 10, 11, 12].map(r => card(r));
  s.position = position;
  s.checkpoint = checkpoint;
  return s;
}
function turn(s, choice, rank) {
  Bus.reveal(s);
  Bus.choose(s, choice);
  s.deck.push(card(rank, '♥'));
  return Bus.draw(s);
}

test('pénalité inclusive depuis le départ ou le checkpoint acquis', () => {
  for (const checkpoint of [0, 2, 5]) {
    for (let at = checkpoint; at < 8; at++) {
      const s = fixture(at, checkpoint);
      s.points = 7;
      const old = s.road[at];
      turn(s, 'moins', 14);
      assert.equal(s.points, 7 + at - checkpoint + 1);
      assert.equal(s.last.penalty, at - checkpoint + 1);
      assert.equal(s.last.fromCheckpoint, checkpoint);
      assert.equal(s.position, checkpoint);
      assert.equal(s.checkpoint, checkpoint);
      assert.equal(s.road[at], s.last.card);
      assert.equal(s.discard.at(-1), old);
    }
  }
});

test('première carte après checkpoint = 1 ; troisième = 3 ; arrivée ratée incluse', () => {
  let s = fixture(2, 2); turn(s, 'moins', 14); assert.equal(s.points, 1);
  s = fixture(4, 2); turn(s, 'moins', 14); assert.equal(s.points, 3);
  assert.equal(s.checkpoint, 2); // Échec sur un checkpoint non acquis.
  assert.equal(s.last.checkpointReached, false);
  s = fixture(7, 5); turn(s, 'moins', 14); assert.equal(s.points, 3);
  assert.equal(s.done, false);
});

test('toutes les comparaisons : Plus/Moins stricts, Égal et As fort, remplacement systématique', () => {
  for (let oldRank = 2; oldRank <= 14; oldRank++) {
    for (let drawnRank = 2; drawnRank <= 14; drawnRank++) {
      for (const choice of ['plus', 'moins', 'egal']) {
        const s = fixture();
        s.road[0] = card(oldRank);
        const old = s.road[0];
        const ok = choice === 'plus' ? drawnRank > oldRank : choice === 'moins' ? drawnRank < oldRank : drawnRank === oldRank;
        assert.equal(turn(s, choice, drawnRank), ok);
        assert.equal(s.road[0], s.last.card);
        assert.equal(s.road[0].rank, drawnRank);
        assert.equal(s.last.old, old);
        assert.equal(s.discard.at(-1), old);
        assert.equal(s.points, ok ? 0 : 1);
        assert.equal(s.position, ok ? 1 : 0);
      }
    }
  }
});

test('une carte remplacée sur succès devient la référence lors du prochain passage', () => {
  const s = fixture(0, 0, []);
  turn(s, 'plus', 10); // 5 devient 10.
  Bus.next(s);
  turn(s, 'plus', 2); // Échec sur la 2e carte : +2 et départ.
  assert.equal(s.points, 2);
  Bus.next(s);
  assert.equal(turn(s, 'moins', 9), true); // 9 < 10, mais pas < 5.
  assert.equal(s.last.old.rank, 10);
  assert.equal(s.road[0].rank, 9);
});

test('checkpoint sécurisé au succès, conservé après plusieurs erreurs, puis nouveau checkpoint', () => {
  let s = fixture(1, 0);
  turn(s, 'plus', 10);
  assert.equal(s.checkpoint, 2);
  assert.equal(s.last.checkpointReached, true);
  Bus.next(s); turn(s, 'moins', 14);
  assert.equal(s.checkpoint, 2);
  assert.equal(s.last.penalty, 1);
  Bus.next(s); turn(s, 'plus', 2);
  assert.equal(s.checkpoint, 2);
  assert.equal(s.points, 2);
  Bus.next(s); turn(s, 'plus', 3);
  Bus.next(s); turn(s, 'plus', 14);
  Bus.next(s); turn(s, 'plus', 14);
  assert.equal(s.checkpoint, 5);
  assert.equal(s.last.checkpointReached, true);
});

test('dernière carte remplacée au succès, arrivée et doubles actions sans effet', () => {
  const s = fixture(7, 5);
  turn(s, 'plus', 14);
  assert.equal(s.done, true);
  assert.equal(s.position, 8);
  assert.equal(s.road[7].rank, 14);
  const saved = JSON.stringify(s);
  Bus.draw(s); Bus.reveal(s); Bus.choose(s, 'moins'); Bus.next(s);
  assert.equal(JSON.stringify(s), saved);
});

test('tirage seulement après révélation et choix ; pronostic invalide refusé', () => {
  const s = fixture();
  const saved = JSON.stringify(s);
  Bus.draw(s); Bus.choose(s, 'plus');
  assert.equal(JSON.stringify(s), saved);
  Bus.reveal(s); Bus.choose(s, 'invalide'); Bus.draw(s);
  assert.equal(s.phase, 'choose');
  assert.equal(s.points, 0);
});

test('recyclage de la seule défausse et remplacement sur succès', () => {
  const s = fixture();
  s.deck = []; s.discard = [card(14, '♥')];
  const old = s.road[0];
  Bus.reveal(s); Bus.choose(s, 'plus'); Bus.draw(s);
  assert.equal(s.road[0].rank, 14);
  assert.deepEqual(s.discard, [old]);
});

test('une sauvegarde JSON reprend les nouvelles valeurs et les checkpoints', () => {
  let s = fixture(4, 2);
  turn(s, 'moins', 14);
  s = JSON.parse(JSON.stringify(s));
  assert.equal(s.points, 3);
  assert.equal(s.road[4].rank, 14);
  assert.equal(s.last.penalty, 3);
  Bus.next(s);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.position, 2);
});

test('100 parties reproductibles : conservation des 52 cartes et pénalités à chaque tirage', () => {
  const random = Math.random;
  let seed = 20261030, recycled = false;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  try {
    for (let game = 0; game < 100; game++) {
      const s = Bus.create(20, game % 2 ? [4, 10] : []);
      let turns = 0;
      while (!s.done && turns++ < 10000) {
        const at = s.position, cp = s.checkpoint, points = s.points, old = s.road[at];
        if (!s.deck.length) recycled = true;
        Bus.reveal(s); Bus.choose(s, old.rank < 8 ? 'plus' : 'moins'); Bus.draw(s);
        assert.equal(s.road[at], s.last.card);
        assert.equal(s.discard.at(-1), old);
        assert.equal(s.points, points + (s.last.ok ? 0 : at - cp + 1));
        assert.ok(s.checkpoint >= cp);
        const all = [...s.road, ...s.deck, ...s.discard];
        assert.equal(all.length, 52);
        assert.equal(new Set(all.map(c => c.rank + c.suit)).size, 52);
        if (!s.done) Bus.next(s);
      }
      assert.ok(s.done, `Partie ${game} terminée`);
    }
    assert.ok(recycled, 'La simulation a épuisé la pioche');
  } finally { Math.random = random; }
});

const Team = require('./team.js');
const Layout = require('./layout.js');
test('équipe : autoroute unique, rotation après succès ou échec et score commun', () => {
  const team=Team.create(['Alice','Bob','Camille'],8,[2,5]);
  const road=team.state.road;
  team.state.road[0]=card(5);
  Bus.reveal(team.state);team.state.deck.push(card(14,'♥'));
  assert.equal(Team.predict(team,'plus'),true);
  assert.equal(Team.predict(team,'plus'),false); // Pas de double tirage.
  assert.equal(team.turn,0); // La main reste au joueur pendant l’animation du résultat.
  assert.equal(Team.advance(team),true);
  assert.equal(Team.advance(team),false); // Pas de double rotation.
  assert.equal(team.turn,1);
  assert.equal(team.state.position,1);
  assert.equal(team.state.road,road);
  team.state.deck.push(card(14,'♦'));
  Bus.reveal(team.state);Team.predict(team,'moins');
  assert.equal(team.state.points,2);
  assert.equal(team.state.position,0);
  Team.advance(team);
  assert.equal(team.turn,2);
  assert.equal(team.state.road,road);
  team.state.deck.push(card(13,'♣'));Bus.reveal(team.state);Team.predict(team,'moins');Team.advance(team);
  assert.equal(team.turn,0);
  assert.equal(team.turns,3);
  assert.equal(team.state.points,2);
});
test('solo, checkpoint partagé, arrivée commune et reprise de résultat sans nouveau tirage', () => {
  let team=Team.create(['Solo'],3,[2]);
  team.state.position=1;team.state.road[1]=card(5);
  Bus.reveal(team.state);team.state.deck.push(card(14));Team.predict(team,'plus');
  team=JSON.parse(JSON.stringify(team));
  const deckSize=team.state.deck.length;
  Team.advance(team);
  assert.equal(team.turn,0);
  assert.equal(team.state.checkpoint,2);
  assert.equal(team.state.deck.length,deckSize);
  team.state.road[2]=card(5);Bus.reveal(team.state);team.state.deck.push(card(14));Team.predict(team,'plus');Team.advance(team);
  assert.equal(team.finished,true);
  assert.equal(team.turns,2);
  assert.equal(Team.advance(team),false);
  assert.equal(Team.predict(team,'plus'),false);
});
test('checkpoint acquis par un joueur, pénalité et retour partagés par le suivant', () => {
  const t=Team.create(['A','B'],8,[2,5]);
  t.state.position=1;t.state.road[1]=card(4);Bus.reveal(t.state);t.state.deck.push(card(8));Team.predict(t,'plus');Team.advance(t);
  assert.equal(t.turn,1);assert.equal(t.state.checkpoint,2);
  t.state.position=4;t.state.road[4]=card(8);Bus.reveal(t.state);t.state.deck.push(card(14));Team.predict(t,'moins');Team.advance(t);
  assert.equal(t.state.points,3);assert.equal(t.state.position,2);assert.equal(t.state.checkpoint,2);assert.equal(t.turn,0);
});
test('3 à 20 cartes : parcours unique, ordonné autour du centre sur mobile et ordinateur', () => {
  for(const compact of [false,true])for(let length=3;length<=20;length++){
    const layout=Layout.route(length,compact);
    assert.equal(layout.cells.length,length);
    assert.equal(new Set(layout.cells.map(c=>`${c.row},${c.col}`)).size,length);
    assert.deepEqual(layout.cells[0],{row:1,col:1,direction:'→'});
    for(const c of layout.cells)assert.ok(c.row===1||c.row===layout.rows||c.col===1||c.col===layout.columns);
    assert.ok(layout.cells.every(c=>c.row>=1&&c.row<=layout.rows&&c.col>=1&&c.col<=layout.columns));
  }
});
