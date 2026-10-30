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

export function rentDue(state, index, diceTotal = 7, options = 1) {
  const cell = BOARD[index], owner = state.owners[index];
  if (owner == null || owner === state.current || state.mortgages.has(index)) return 0;
  const mult = typeof options === 'number' ? options : (options?.railMultiplier || options?.multiplier || 1);
  const utilMult = typeof options === 'object' && options?.utilityMultiplier ? options.utilityMultiplier : null;
  if (cell.type === 'property') {
    const houses = state.houses[index] || 0;
    return (houses ? cell.rent[houses] : cell.rent[0] * (groupOwned(state, owner, cell.color) ? 2 : 1)) * mult;
  }
  if (cell.type === 'railroad') {
    const rCount = ownedBy(state, owner).filter(x => BOARD[x].type === 'railroad').length;
    const base = [0, 25, 50, 100, 200][Math.min(4, Math.max(1, rCount))] || 25;
    return base * mult;
  }
  if (cell.type === 'utility') {
    const uCount = ownedBy(state, owner).filter(x => BOARD[x].type === 'utility').length;
    const factor = utilMult || (uCount === 2 ? 10 : 4);
    return diceTotal * factor;
  }
  return 0;
}

function resolveIndexAndOwner(state, a, b) {
  if (b === undefined) return { index: a, owner: state.current };
  if (groupFor(b) && state.owners[b] === a) return { index: b, owner: a };
  if (groupFor(a) && state.owners[a] === b) return { index: a, owner: b };
  if (groupFor(b)) return { index: b, owner: a };
  return { index: a, owner: b };
}

export function canBuild(state, arg1, arg2) {
  const { index, owner } = resolveIndexAndOwner(state, arg1, arg2);
  const cell = BOARD[index], group = groupFor(index);
  if (!group || state.owners[index] !== owner || !groupOwned(state, owner, group) || GROUPS[group].some(i => state.mortgages.has(i))) return false;
  const ids = GROUPS[group], levels = ids.map(i => state.houses[i] || 0), level = state.houses[index] || 0;
  const pCash = state.players[owner]?.cash ?? state.players[owner]?.data?.cash ?? 0;
  return level < 5 && Math.min(...levels) === level && (level < 4 ? state.bank.houses > 0 : state.bank.hotels > 0) && pCash >= (cell.house || cell.houseCost || 50);
}
export function canSell(state, arg1, arg2) {
  const { index, owner } = resolveIndexAndOwner(state, arg1, arg2);
  const group = groupFor(index); if (!group || state.owners[index] !== owner) return false;
  const level = state.houses[index] || 0, ids = GROUPS[group];
  return level > 0 && Math.max(...ids.map(i => state.houses[i] || 0)) === level;
}
export const mortgageValue = index => Math.floor(BOARD[index].price / 2);
export const unmortgageCost = index => Math.round(mortgageValue(index) * 1.1);
export function netWorth(state, owner) {
  const pCash = state.players[owner]?.cash ?? state.players[owner]?.data?.cash ?? 0;
  return pCash + ownedBy(state, owner).reduce((sum, i) => {
    const isMort = state.mortgages?.has ? state.mortgages.has(i) : false;
    const propVal = isMort ? 0 : mortgageValue(i);
    const houseVal = (state.houses[i] || 0) * (BOARD[i].house || BOARD[i].houseCost || 0) / 2;
    return sum + propVal + houseVal;
  }, 0);
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
      rentMultiplier: card.rentMultiplier || card.utilityMultiplier || 1,
      utilityMultiplier: card.utilityMultiplier || null
    };
  }
  return null;
}

export function build(state, arg1, arg2) {
  const { index, owner } = resolveIndexAndOwner(state, arg1, arg2);
  if (!canBuild(state, index, owner)) return false;
  const c = BOARD[index], level = state.houses[index] || 0;
  const cost = c.house || c.houseCost || 50;
  const p = state.players[owner];
  if (p) {
    if (p.cash !== undefined) p.cash -= cost;
    if (p.data && p.data.cash !== undefined) p.data.cash -= cost;
  }
  state.houses[index] = level + 1;
  if (level === 4) { state.bank.houses += 4; state.bank.hotels--; }
  else state.bank.houses--;
  return true;
}
export function sellBuilding(state, arg1, arg2) {
  const { index, owner } = resolveIndexAndOwner(state, arg1, arg2);
  if (!canSell(state, index, owner)) return 0;
  const c = BOARD[index], level = state.houses[index], value = Math.floor((c.house || c.houseCost || 50) / 2);
  const p = state.players[owner];
  if (p) {
    if (p.cash !== undefined) p.cash += value;
    if (p.data && p.data.cash !== undefined) p.data.cash += value;
  }
  state.houses[index] = level - 1;
  if (level === 5) { state.bank.hotels++; state.bank.houses -= 4; }
  else state.bank.houses++;
  return value;
}

export function applyCard(state, player, card, diceTotal = 7) {
  const pId = player.id !== undefined ? player.id : (state.players ? state.players.indexOf(player) : 0);
  const addCash = (p, amt) => {
    if (p.cash !== undefined) p.cash += amt;
    if (p.data && p.data.cash !== undefined) p.data.cash += amt;
  };
  const getPos = p => (p.pos !== undefined ? p.pos : (p.data?.pos ?? 0));
  const setPos = (p, pos) => {
    if (p.pos !== undefined) p.pos = pos;
    if (p.data) p.data.pos = pos;
  };

  const res = {
    card,
    cashDelta: 0,
    moved: false,
    newPosition: getPos(player),
    collectedGo: false,
    jail: false,
    jailCard: false,
    rentDue: 0,
    rentOwner: null,
    targetTile: null
  };

  // 1. Direct cash
  if (card.cash !== undefined) {
    addCash(player, card.cash);
    res.cashDelta += card.cash;
  }

  // 2. Jail card
  if (card.jailCard) {
    if (player.jailCard !== undefined) player.jailCard = (player.jailCard || 0) + 1;
    if (player.data) player.data.jailCard = (player.data.jailCard || 0) + 1;
    res.jailCard = true;
  }

  // 3. Jail
  if (card.jail) {
    setPos(player, 10);
    if (player.jail !== undefined) player.jail = 1;
    if (player.data) player.data.jail = 1;
    if (player.doubles !== undefined) player.doubles = 0;
    if (player.data) player.data.doubles = 0;
    res.jail = true;
    res.newPosition = 10;
    return res;
  }

  // 4. payEach
  if (card.payEach) {
    const others = (state.players || []).filter(p => p !== player && !p.bankrupt && !p.data?.bankrupt);
    for (const other of others) {
      addCash(player, -card.payEach);
      addCash(other, card.payEach);
      res.cashDelta -= card.payEach;
    }
  }

  // 5. collectEach
  if (card.collectEach) {
    const others = (state.players || []).filter(p => p !== player && !p.bankrupt && !p.data?.bankrupt);
    for (const other of others) {
      addCash(other, -card.collectEach);
      addCash(player, card.collectEach);
      res.cashDelta += card.collectEach;
    }
  }

  // 6. repair
  if (card.repair && Array.isArray(card.repair)) {
    const [hFee, oFee] = card.repair;
    let fee = 0;
    for (const idx of ownedBy(state, pId)) {
      const lv = state.houses[idx] || 0;
      if (lv === 5) fee += oFee;
      else if (lv > 0) fee += lv * hFee;
    }
    if (fee > 0) {
      addCash(player, -fee);
      res.cashDelta -= fee;
    }
  }

  // 7. Movement
  if (card.move !== undefined || card.back !== undefined || card.nearest !== undefined) {
    const curPos = getPos(player);
    const mv = resolveCardMovement(curPos, card);
    if (mv) {
      res.moved = true;
      res.newPosition = mv.position;
      res.targetTile = BOARD[mv.position];

      if (mv.collectGo) {
        addCash(player, GO_SALARY);
        res.collectedGo = true;
        res.cashDelta += GO_SALARY;
      }

      setPos(player, mv.position);

      const tile = BOARD[mv.position];
      if (['property', 'railroad', 'utility'].includes(tile.type)) {
        const owner = state.owners[mv.position];
        if (owner !== null && owner !== pId && !state.mortgages.has(mv.position)) {
          const r = rentDue(state, mv.position, diceTotal, {
            railMultiplier: card.nearest === 'railroad' ? (card.rentMultiplier || 2) : 1,
            utilityMultiplier: card.nearest === 'utility' ? (card.utilityMultiplier || 10) : null
          });
          res.rentDue = r;
          res.rentOwner = owner;
        }
      }
    }
  }

  return res;
}
