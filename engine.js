(function (root) {
  const shuffle = cards => {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };

  function create(length, checkpoints) {
    const deck = shuffle(['♠', '♥', '♦', '♣'].flatMap(suit =>
      Array.from({ length: 13 }, (_, i) => ({ rank: i + 2, suit }))));
    return {
      road: deck.splice(0, length), deck, discard: [], checkpoints: [...checkpoints],
      position: 0, checkpoint: 0, points: 0, seen: [], phase: 'reveal',
      choice: null, last: null, done: false
    };
  }

  function reveal(state) {
    if (state.phase !== 'reveal' || state.done) return;
    state.seen[state.position] = true;
    state.phase = 'choose';
  }

  function choose(state, choice) {
    if (state.phase !== 'choose' || !['plus', 'moins', 'egal'].includes(choice)) return;
    state.choice = choice;
    state.phase = 'draw';
  }

  function draw(state) {
    if (state.phase !== 'draw') return;
    if (!state.deck.length) state.deck = shuffle(state.discard.splice(0));
    const card = state.deck.pop();
    const at = state.position;
    const old = state.road[at];
    const fromCheckpoint = state.checkpoint;
    const ok = state.choice === 'plus' ? card.rank > old.rank
      : state.choice === 'moins' ? card.rank < old.rank : card.rank === old.rank;
    // checkpoint counts already secured cards; at is zero-based.
    const penalty = ok ? 0 : at - fromCheckpoint + 1;

    // Every draw replaces the bus card, including a successful or equal draw.
    state.road[at] = card;
    state.discard.push(old);
    if (ok) {
      state.position++;
      if (state.checkpoints.includes(state.position)) {
        state.checkpoint = Math.max(state.checkpoint, state.position);
      }
      state.done = state.position === state.road.length;
    } else {
      state.points += penalty;
      state.position = fromCheckpoint;
    }
    state.last = {
      card, old, ok, at, penalty, fromCheckpoint,
      checkpointReached: state.checkpoint > fromCheckpoint
    };
    state.phase = 'result';
    return ok;
  }

  function next(state) {
    if (state.phase === 'result' && !state.done) {
      state.phase = 'reveal';
      state.choice = null;
      state.last = null;
    }
  }

  const api = { create, reveal, choose, draw, next };
  if (typeof module !== 'undefined') module.exports = api;
  root.Bus = api;
})(globalThis);
