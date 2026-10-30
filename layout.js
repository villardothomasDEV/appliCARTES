(function (root) {
  // A marked serpentine route gives every card room, including on narrow phones.
  function route(count, compact) {
    const columns = compact ? 3 : 5;
    const rows = Math.ceil(count / columns);
    const cells = Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / columns) + 1;
      const offset = index % columns;
      const col = row % 2 ? offset + 1 : columns - offset;
      const endOfRow = offset === columns - 1;
      return { row, col, direction: index === count - 1 ? '⚑' : endOfRow ? '↓' : row % 2 ? '→' : '←' };
    });
    return { columns, rows, cells };
  }
  const api = { route };
  if (typeof module !== 'undefined') module.exports = api;
  root.Layout = api;
})(globalThis);
