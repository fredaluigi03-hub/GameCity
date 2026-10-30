// Rules engine for Tombola Napoletana

export const PRIZE_TIERS = [
  { id: 'ambo', name: 'Ambo', count: 2, points: 200, label: '200 pt' },
  { id: 'terno', name: 'Terno', count: 3, points: 500, label: '500 pt' },
  { id: 'quaterna', name: 'Quaterna', count: 4, points: 1200, label: '1.200 pt' },
  { id: 'cinquina', name: 'Cinquina', count: 5, points: 3000, label: '3.000 pt' },
  { id: 'tombola', name: 'Tombola', count: 15, points: 10000, label: '10.000 pt' }
];

export const CARTELLA_THEMES = [
  { id: 'red', name: 'Rosso Tradizione', color: '#dc2626', border: '#ef4444', bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.24), rgba(15, 23, 42, 0.92))' },
  { id: 'blue', name: 'Blu Marechiaro', color: '#2563eb', border: '#3b82f6', bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.24), rgba(15, 23, 42, 0.92))' },
  { id: 'gold', name: 'Oro Spaccanapoli', color: '#f59e0b', border: '#fbbf24', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.24), rgba(15, 23, 42, 0.92))' },
  { id: 'green', name: 'Verde Vesuvio', color: '#10b981', border: '#34d399', bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(15, 23, 42, 0.92))' },
  { id: 'purple', name: 'Viola Regale', color: '#9333ea', border: '#c084fc', bg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.24), rgba(15, 23, 42, 0.92))' },
  { id: 'coral', name: 'Corallo Borbonico', color: '#ea580c', border: '#fb923c', bg: 'linear-gradient(135deg, rgba(234, 88, 12, 0.24), rgba(15, 23, 42, 0.92))' }
];

export function createPrizeTiers(customConfig = {}) {
  return [
    { id: 'ambo', name: 'Ambo', count: 2, points: Number(customConfig.amboPoints) || 200, label: customConfig.amboDesc || '200 pt' },
    { id: 'terno', name: 'Terno', count: 3, points: Number(customConfig.ternoPoints) || 500, label: customConfig.ternoDesc || '500 pt' },
    { id: 'quaterna', name: 'Quaterna', count: 4, points: Number(customConfig.quaternaPoints) || 1200, label: customConfig.quaternaDesc || '1.200 pt' },
    { id: 'cinquina', name: 'Cinquina', count: 5, points: Number(customConfig.cinquinaPoints) || 3000, label: customConfig.cinquinaDesc || '3.000 pt' },
    { id: 'tombola', name: 'Tombola', count: 15, points: Number(customConfig.tombolaPoints) || 10000, label: customConfig.tombolaDesc || '10.000 pt' },
    ...(customConfig.hasTombolino ? [{ id: 'tombolino', name: 'Tombolino', count: 15, points: Number(customConfig.tombolinoPoints) || 5000, label: customConfig.tombolinoDesc || '5.000 pt' }] : [])
  ];
}

// Fingerprint of the 15 numbers contained in a cartella
export function getCardFingerprint(card) {
  const nums = card.grid.flat().filter(n => n > 0).sort((a, b) => a - b);
  return nums.join(',');
}

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
  const grid = [Array(9).fill(0), Array(9).fill(0), Array(9).fill(0)];
  
  // Choose row column indices
  for (let r = 0; r < 3; r++) {
    const chosen = [];
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
    for (const c of available) {
      if (chosen.length < 5) {
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

  return { id, grid, color: '#dc2626' };
}

// Generates a cartella that is guaranteed not to duplicate any existing card in the game
export function generateUniqueCartella(id = 1, existingFingerprints = new Set(), color = '#dc2626') {
  for (let attempts = 0; attempts < 1000; attempts++) {
    const card = generateCartella(id);
    const fp = getCardFingerprint(card);
    if (!existingFingerprints.has(fp)) {
      existingFingerprints.add(fp);
      card.color = color;
      card.fingerprint = fp;
      return card;
    }
  }
  const card = generateCartella(id);
  card.color = color;
  return card;
}

// Counts marked numbers in a card row
export function checkRowMarks(row, drawnSet) {
  return row.filter(n => n > 0 && drawnSet.has(n)).length;
}

// Checks highest achieved prize on a single card given drawn numbers
export function evaluateCard(card, drawnSet) {
  let maxRowMarks = 0;
  let totalMarks = 0;
  const rowMarks = [];

  for (const row of card.grid) {
    const marks = checkRowMarks(row, drawnSet);
    rowMarks.push(marks);
    if (marks > maxRowMarks) maxRowMarks = marks;
    totalMarks += marks;
  }

  return {
    maxRowMarks,
    totalMarks,
    rowMarks,
    hasAmbo: maxRowMarks >= 2,
    hasTerno: maxRowMarks >= 3,
    hasQuaterna: maxRowMarks >= 4,
    hasCinquina: maxRowMarks >= 5,
    hasTombola: totalMarks === 15
  };
}

// Check next prize tier available for a single cartella
export function checkNextPrize(claimedPrizes, card, drawnSet, customTiers = PRIZE_TIERS) {
  const evalCard = evaluateCard(card, drawnSet);
  const tiers = customTiers || PRIZE_TIERS;
  for (const tier of tiers) {
    if (!claimedPrizes.has(tier.id)) {
      if (tier.id === 'ambo' && evalCard.hasAmbo) return tier;
      if (tier.id === 'terno' && evalCard.hasTerno) return tier;
      if (tier.id === 'quaterna' && evalCard.hasQuaterna) return tier;
      if (tier.id === 'cinquina' && evalCard.hasCinquina) return tier;
      if (tier.id === 'tombola' && evalCard.hasTombola) return tier;
      if (tier.id === 'tombolino' && evalCard.hasTombola) return tier;
    }
  }
  return null;
}

// Check next prize tier across multiple cartelle of a player
export function checkNextPrizeForCartelle(claimedPrizes, cartelleList, drawnSet, customTiers = PRIZE_TIERS) {
  const tiers = customTiers || PRIZE_TIERS;
  for (const tier of tiers) {
    if (!claimedPrizes.has(tier.id)) {
      for (const card of cartelleList) {
        const ev = evaluateCard(card, drawnSet);
        let match = false;
        if (tier.id === 'ambo' && ev.hasAmbo) match = true;
        else if (tier.id === 'terno' && ev.hasTerno) match = true;
        else if (tier.id === 'quaterna' && ev.hasQuaterna) match = true;
        else if (tier.id === 'cinquina' && ev.hasCinquina) match = true;
        else if (tier.id === 'tombola' && ev.hasTombola) match = true;
        else if (tier.id === 'tombolino' && ev.hasTombola) match = true;

        if (match) {
          return { tier, card, evalCard: ev };
        }
      }
    }
  }
  return null;
}
