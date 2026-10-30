// Rules engine for Tombola Napoletana

export const PRIZE_TIERS = [
  { id: 'ambo', name: 'Ambo', count: 2, points: 200 },
  { id: 'terno', name: 'Terno', count: 3, points: 500 },
  { id: 'quaterna', name: 'Quaterna', count: 4, points: 1200 },
  { id: 'cinquina', name: 'Cinquina', count: 5, points: 3000 },
  { id: 'tombola', name: 'Tombola', count: 15, points: 10000 }
];

// Generates a traditional Tombola card (3 rows x 9 columns, 5 numbers per row, sorted columns)
export function generateCartella(id = 1) {
  // Col bounds: col 0: 1-9, col 1: 10-19, ..., col 8: 80-90
  const cols = Array.from({ length: 9 }, (_, c) => {
    const min = c === 0 ? 1 : c * 10;
    const max = c === 8 ? 90 : c * 10 + 9;
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  });

  // Decide distribution: exactly 5 numbers per row, each column has 1, 2, or 3 numbers (sum = 15)
  // Standard valid layout: 3 rows, pick 5 columns for each row
  const grid = [Array(9).fill(0), Array(9).fill(0), Array(9).fill(0)];
  
  // Choose row column indices
  for (let r = 0; r < 3; r++) {
    const chosen = [];
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
    for (const c of available) {
      if (chosen.length < 5) {
        // avoid having empty column across all 3 rows if possible
        const colCount = grid[0][c] + grid[1][c];
        if (r === 2 && colCount === 0 && chosen.length < 5) {
          chosen.push(c);
        } else if (chosen.length < 5) {
          chosen.push(c);
        }
      }
    }
    chosen.forEach(c => { grid[r][c] = 1; });
  }

  // Ensure each column has at least one number; if a col is completely 0, fix it
  for (let c = 0; c < 9; c++) {
    const count = grid[0][c] + grid[1][c] + grid[2][c];
    if (count === 0) {
      // Find a row with another column that has > 1 and swap
      for (let r = 0; r < 3; r++) {
        const otherCols = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(k => grid[r][k] === 1 && (grid[0][k] + grid[1][k] + grid[2][k] > 1));
        if (otherCols.length) {
          const swapCol = otherCols[0];
          grid[r][swapCol] = 0;
          grid[r][c] = 1;
          break;
        }
      }
    }
  }

  // Populate numbers from cols pool in sorted order per column
  for (let c = 0; c < 9; c++) {
    const rowSlots = [0, 1, 2].filter(r => grid[r][c] === 1);
    const nums = cols[c].slice(0, rowSlots.length).sort((a, b) => a - b);
    rowSlots.forEach((r, idx) => {
      grid[r][c] = nums[idx];
    });
  }

  return { id, grid };
}

// Counts marked numbers in a card row
export function checkRowMarks(row, drawnSet) {
  return row.filter(n => n > 0 && drawnSet.has(n)).length;
}

// Checks highest achieved prize on a single card given drawn numbers
export function evaluateCard(card, drawnSet) {
  let maxRowMarks = 0;
  let totalMarks = 0;

  for (const row of card.grid) {
    const marks = checkRowMarks(row, drawnSet);
    if (marks > maxRowMarks) maxRowMarks = marks;
    totalMarks += marks;
  }

  return {
    maxRowMarks,
    totalMarks,
    hasAmbo: maxRowMarks >= 2,
    hasTerno: maxRowMarks >= 3,
    hasQuaterna: maxRowMarks >= 4,
    hasCinquina: maxRowMarks >= 5,
    hasTombola: totalMarks === 15
  };
}

// Check next prize tier available
export function checkNextPrize(claimedPrizes, card, drawnSet) {
  const evalCard = evaluateCard(card, drawnSet);
  if (!claimedPrizes.has('ambo') && evalCard.hasAmbo) return PRIZE_TIERS[0];
  if (claimedPrizes.has('ambo') && !claimedPrizes.has('terno') && evalCard.hasTerno) return PRIZE_TIERS[1];
  if (claimedPrizes.has('terno') && !claimedPrizes.has('quaterna') && evalCard.hasQuaterna) return PRIZE_TIERS[2];
  if (claimedPrizes.has('quaterna') && !claimedPrizes.has('cinquina') && evalCard.hasCinquina) return PRIZE_TIERS[3];
  if (claimedPrizes.has('cinquina') && !claimedPrizes.has('tombola') && evalCard.hasTombola) return PRIZE_TIERS[4];
  return null;
}
