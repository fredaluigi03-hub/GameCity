export const ROWS = 6;
export const COLS = 7;

export const emptyBoard = () => Array.from({length: ROWS}, () => Array(COLS).fill(0));
export const validColumns = board => Array.from({length: COLS}, (_, col) => col).filter(col => board[0][col] === 0);

export function dropDisc(board, col, player) {
  if (!Number.isInteger(col) || col < 0 || col >= COLS || !player || board[0][col] !== 0) return -1;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      board[row][col] = player;
      return row;
    }
  }
  return -1;
}

export function hasFour(board, row, col, player) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
        r += dr * sign;
        c += dc * sign;
      }
    }
    return count >= 4;
  });
}

export function getWinningCells(board, row, col, player) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const cells = [{row, col}];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        cells.push({row: r, col: c});
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

export function winningMove(board, col, player) {
  const row = dropDisc(board, col, player);
  if (row < 0) return false;
  const won = hasFour(board, row, col, player);
  board[row][col] = 0;
  return won;
}
