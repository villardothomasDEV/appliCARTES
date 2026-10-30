(function (root) {
  const Bus = typeof module !== 'undefined' ? require('./engine.js') : root.Bus;
  function create(names, length, checkpoints) {
    return { names: [...names], turn: 0, turns: 0, finished: false, state: Bus.create(length, checkpoints) };
  }
  function predict(team, choice) {
    if (team.finished || team.state.phase !== 'choose') return false;
    Bus.choose(team.state, choice);
    if (team.state.phase !== 'draw') return false;
    Bus.draw(team.state);
    return true;
  }
  function advance(team) {
    if (team.finished || team.state.phase !== 'result') return false;
    team.turns++;
    if (team.state.done) team.finished = true;
    else {
      Bus.next(team.state);
      team.turn = (team.turn + 1) % team.names.length;
    }
    return true;
  }
  const api = { create, predict, advance };
  if (typeof module !== 'undefined') module.exports = api;
  root.Team = api;
})(globalThis);
