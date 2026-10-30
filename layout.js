(function (root) {
  // Clockwise cells on the perimeter; the center always remains free.
  function route(count, compact) {
    const columns = compact ? 4 : 6;
    const rows = Math.max(5, Math.ceil((count - 2 * columns) / 2) + 2);
    const cells = [];
    for (let col = 1; col <= columns; col++) cells.push({ row: 1, col, direction: '→' });
    for (let row = 2; row <= rows; row++) cells.push({ row, col: columns, direction: '↓' });
    for (let col = columns - 1; col >= 1; col--) cells.push({ row: rows, col, direction: '←' });
    for (let row = rows - 1; row > 1; row--) cells.push({ row, col: 1, direction: '↑' });
    return { columns, rows, cells: Array.from({ length: count }, (_, i) => cells[Math.round(i * (cells.length - 1) / (count - 1))]) };
  }
  const api = { route };
  if (typeof module !== 'undefined') module.exports = api;
  root.Layout = api;
})(globalThis);
