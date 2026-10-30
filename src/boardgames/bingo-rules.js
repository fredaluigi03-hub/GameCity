// Bingo rules engine (90-Ball European/Italian Standard)

export function generateBingoTicket(id = 1) {
  // Columns 0-8: 1-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80-90
  const cols = Array.from({ length: 9 }, (_, c) => {
    const min = c === 0 ? 1 : c * 10;
    const max = c === 8 ? 90 : c * 10 + 9;
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  });

  const grid = [Array(9).fill(0), Array(9).fill(0), Array(9).fill(0)];
  for (let r = 0; r < 3; r++) {
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 5);
    available.forEach(c => { grid[r][c] = 1; });
  }

  // Ensure every column has at least one number
  for (let c = 0; c < 9; c++) {
    const count = grid[0][c] + grid[1][c] + grid[2][c];
    if (count === 0) {
      for (let r = 0; r < 3; r++) {
        const canSwap = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(k => grid[r][k] === 1 && (grid[0][k] + grid[1][k] + grid[2][k] > 1));
        if (canSwap !== undefined) {
          grid[r][canSwap] = 0;
          grid[r][c] = 1;
          break;
        }
      }
    }
  }

  // Populate numbers in sorted order per column
  for (let c = 0; c < 9; c++) {
    const slots = [0, 1, 2].filter(r => grid[r][c] === 1);
    const nums = cols[c].slice(0, slots.length).sort((a, b) => a - b);
    slots.forEach((r, idx) => { grid[r][c] = nums[idx]; });
  }

  return { id, grid };
}

export function evaluateBingoCard(ticket, drawnSet) {
  let maxLine = 0;
  let total = 0;

  for (const row of ticket.grid) {
    const marks = row.filter(n => n > 0 && drawnSet.has(n)).length;
    if (marks > maxLine) maxLine = marks;
    total += marks;
  }

  return {
    maxLine,
    total,
    hasCinquina: maxLine >= 5,
    hasBingo: total === 15,
    toBingo: 15 - total
  };
}
