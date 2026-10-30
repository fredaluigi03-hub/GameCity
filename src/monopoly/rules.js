import {BOARD, GROUPS} from './data.js';

export const START_CASH = 1500;
export const START_POSITION = 0;
export const GO_SALARY = 200;
export const HOUSE_SUPPLY = 32;
export const HOTEL_SUPPLY = 12;
export const groupFor = index => Object.entries(GROUPS).find(([, ids]) => ids.includes(index))?.[0] ?? null;
export const ownedBy = (state, owner) => state.owners.map((p, i) => p === owner ? i : -1).filter(i => i >= 0);
export const groupOwned = (state, owner, group) => (GROUPS[group] || []).every(i => state.owners[i] === owner);
export const mortgaged = (state, i) => state.mortgages.has(i);

export function rentDue(state, index, diceTotal, multiplier = 1) {
  const cell = BOARD[index], owner = state.owners[index];
  if (owner == null || owner === state.current || state.mortgages.has(index)) return 0;
  if (cell.type === 'property') {
    const houses = state.houses[index] || 0;
    return (houses ? cell.rent[houses] : cell.rent[0] * (groupOwned(state, owner, cell.color) ? 2 : 1)) * multiplier;
  }
  if (cell.type === 'railroad') return ([25,50,100,200].filter((_, i) => ownedBy(state, owner).filter(x => BOARD[x].type === 'railroad').length > i).at(-1) || 25) * multiplier;
  if (cell.type === 'utility') {
    const count = ownedBy(state, owner).filter(x => BOARD[x].type === 'utility').length;
    return diceTotal * (multiplier === 10 ? 10 : count === 2 ? 10 : 4);
  }
  return 0;
}

export function canBuild(state, index, owner = state.current) {
  const cell = BOARD[index], group = groupFor(index);
  if (!group || state.owners[index] !== owner || !groupOwned(state, owner, group) || GROUPS[group].some(i => state.mortgages.has(i))) return false;
  const ids = GROUPS[group], levels = ids.map(i => state.houses[i] || 0), level = state.houses[index] || 0;
  return level < 5 && Math.min(...levels) === level && (level < 4 ? state.bank.houses > 0 : state.bank.hotels > 0) && state.players[owner].cash >= cell.house;
}
export function canSell(state, index, owner = state.current) {
  const group = groupFor(index); if (!group || state.owners[index] !== owner) return false;
  const level = state.houses[index] || 0, ids = GROUPS[group];
  return level > 0 && Math.max(...ids.map(i => state.houses[i] || 0)) === level;
}
export const mortgageValue = index => Math.floor(BOARD[index].price / 2);
export const unmortgageCost = index => Math.round(mortgageValue(index) * 1.1);
export function netWorth(state, owner) {
  return (state.players[owner]?.cash || 0) + ownedBy(state, owner).reduce((sum, i) => sum + mortgageValue(i) + (state.houses[i] || 0) * BOARD[i].house / 2, 0);
}
export function transferable(state, index) {
  const group = groupFor(index);
  return !group || GROUPS[group].every(i => !(state.houses[i] || 0));
}

export function resolveCardMovement(position, card) {
  if (card.move != null) {
    return {position: card.move, collectGo: Boolean(card.collectGo || card.move < position), rentMultiplier: 1};
  }
  if (card.back) {
    return {position: (position - card.back + BOARD.length) % BOARD.length, collectGo: false, rentMultiplier: 1};
  }
  if (card.nearest) {
    const targets = BOARD.map((cell, index) => cell.type === card.nearest ? index : -1).filter(index => index >= 0);
    const target = targets.find(index => index > position) ?? targets[0];
    return {
      position: target,
      collectGo: target < position,
      rentMultiplier: card.rentMultiplier || card.utilityMultiplier || 1
    };
  }
  return null;
}

export function build(state, index, owner = state.current) {
  if (!canBuild(state, index, owner)) return false;
  const c = BOARD[index], level = state.houses[index] || 0;
  state.players[owner].cash -= c.house; state.houses[index] = level + 1;
  if (level === 4) { state.bank.houses += 4; state.bank.hotels--; }
  else state.bank.houses--;
  return true;
}
export function sellBuilding(state, index, owner = state.current) {
  if (!canSell(state, index, owner)) return 0;
  const c = BOARD[index], level = state.houses[index], value = Math.floor(c.house / 2);
  state.houses[index] = level - 1; state.players[owner].cash += value;
  if (level === 5) { state.bank.hotels++; state.bank.houses -= 4; }
  else state.bank.houses++;
  return value;
}
