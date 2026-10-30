import test from 'node:test';
import assert from 'node:assert/strict';

import { BOARD, CHANCE, CHEST } from '../src/monopoly/data.js';
import {
  START_CASH,
  GO_SALARY,
  rentDue,
  canBuild,
  build,
  canSell,
  sellBuilding,
  mortgageValue,
  unmortgageCost,
  netWorth,
  ownedBy,
  groupFor,
  resolveCardMovement,
  applyCard
} from '../src/monopoly/rules.js';

test('Simulate full 4-player Monopoly game across multiple rounds without deadlocks', () => {
  const players = [
    { id: 0, name: 'Luigi', color: '#38bdf8', cash: START_CASH, pos: 0, jail: 0, jailCard: 0, doubles: 0, bankrupt: false },
    { id: 1, name: 'CPU 1 (Rita)', color: '#4fb3a9', cash: START_CASH, pos: 0, jail: 0, jailCard: 0, doubles: 0, bankrupt: false },
    { id: 2, name: 'CPU 2 (Gino)', color: '#f43f5e', cash: START_CASH, pos: 0, jail: 0, jailCard: 0, doubles: 0, bankrupt: false },
    { id: 3, name: 'CPU 3 (Nora)', color: '#a855f7', cash: START_CASH, pos: 0, jail: 0, jailCard: 0, doubles: 0, bankrupt: false }
  ];

  const state = {
    owners: Array(40).fill(null),
    houses: Array(40).fill(0),
    mortgages: new Set(),
    bank: { houses: 32, hotels: 12 },
    players,
    current: 0
  };

  const activePlayers = () => players.filter(p => !p.bankrupt);

  function chargePlayer(player, amount, creditor = null) {
    while (player.cash < amount) {
      // 1. Sell houses
      const owned = ownedBy(state, player.id).filter(i => canSell(state, player.id, i));
      if (owned.length > 0) {
        const idx = owned[0];
        const refund = sellBuilding(state, player.id, idx);
        player.cash += refund;
        continue;
      }
      // 2. Mortgage
      const mortable = ownedBy(state, player.id).filter(i => !state.mortgages.has(i) && (state.houses[i] || 0) === 0);
      if (mortable.length > 0) {
        const idx = mortable[0];
        const val = mortgageValue(idx);
        state.mortgages.add(idx);
        player.cash += val;
        continue;
      }
      break;
    }

    if (player.cash >= amount) {
      player.cash -= amount;
      if (creditor) creditor.cash += amount;
      return true;
    } else {
      // Bankruptcy
      player.bankrupt = true;
      const left = Math.max(0, player.cash);
      player.cash = 0;
      if (creditor) creditor.cash += left;
      ownedBy(state, player.id).forEach(i => {
        state.houses[i] = 0;
        state.owners[i] = creditor ? creditor.id : null;
        if (!creditor) state.mortgages.delete(i);
      });
      return false;
    }
  }

  let rounds = 0;
  const MAX_ROUNDS = 200;

  let chanceDeck = [...CHANCE].sort(() => Math.random() - 0.5);
  let chestDeck = [...CHEST].sort(() => Math.random() - 0.5);
  let totalCardsExecuted = 0;

  while (activePlayers().length > 1 && rounds < MAX_ROUNDS) {
    rounds++;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.bankrupt) continue;
      state.current = i;

      let rollAgain = true;
      p.doubles = 0;

      while (rollAgain && !p.bankrupt) {
        rollAgain = false;

        // In Jail?
        if (p.jail > 0) {
          if (p.jailCard > 0) {
            p.jailCard--;
            p.jail = 0;
          } else if (p.cash >= 50 && p.jail >= 3) {
            p.cash -= 50;
            p.jail = 0;
          }
        }

        const d1 = 1 + Math.floor(Math.random() * 6);
        const d2 = 1 + Math.floor(Math.random() * 6);
        const sum = d1 + d2;
        const isDouble = d1 === d2;

        if (p.jail > 0) {
          if (isDouble) {
            p.jail = 0;
          } else {
            p.jail++;
            break;
          }
        } else if (isDouble) {
          p.doubles++;
          if (p.doubles >= 3) {
            p.pos = 10;
            p.jail = 1;
            p.doubles = 0;
            break;
          }
          rollAgain = true;
        }

        // Move token
        const prev = p.pos;
        p.pos = (p.pos + sum) % 40;
        if (p.pos < prev && prev !== 0) {
          p.cash += GO_SALARY; // Collect 200 on passing GO
        }

        const space = BOARD[p.pos];
        assert.ok(space, `Space at pos ${p.pos} must exist`);

        if (space.type === 'gotojail' || space.type === 'goToJail') {
          p.pos = 10;
          p.jail = 1;
          p.doubles = 0;
          rollAgain = false;
          break;
        } else if (space.type === 'tax') {
          chargePlayer(p, space.amount, null);
        } else if (space.type === 'chance' || space.type === 'chest') {
          const deck = space.type === 'chance' ? chanceDeck : chestDeck;
          if (deck.length === 0) {
            const fresh = space.type === 'chance' ? [...CHANCE] : [...CHEST];
            deck.push(...fresh.sort(() => Math.random() - 0.5));
          }
          const card = deck.shift();
          totalCardsExecuted++;
          const res = applyCard(state, p, card, sum);
          if (res.jail) {
            p.pos = 10;
            p.jail = 1;
            p.doubles = 0;
            rollAgain = false;
            break;
          }
          if (p.cash < 0) {
            chargePlayer(p, 0, null); // trigger bankruptcy resolution if negative
          }
          if (res.rentDue > 0 && res.rentOwner !== null) {
            chargePlayer(p, res.rentDue, players[res.rentOwner]);
          } else if (res.moved) {
            const dest = BOARD[p.pos];
            if (['property', 'railroad', 'utility'].includes(dest.type)) {
              const destOwner = state.owners[p.pos];
              if (destOwner === null && p.cash >= dest.price + 100) {
                p.cash -= dest.price;
                state.owners[p.pos] = p.id;
              } else if (destOwner !== null && destOwner !== p.id && !state.mortgages.has(p.pos)) {
                const rent = rentDue(state, p.pos, sum);
                chargePlayer(p, rent, players[destOwner]);
              }
            } else if (dest.type === 'tax') {
              chargePlayer(p, dest.amount, null);
            }
          }
        } else if (['property', 'railroad', 'utility'].includes(space.type)) {
          const ownerId = state.owners[p.pos];
          if (ownerId === null) {
            // Buy if affordable
            if (p.cash >= space.price + 100) {
              p.cash -= space.price;
              state.owners[p.pos] = p.id;
            }
          } else if (ownerId !== p.id && !state.mortgages.has(p.pos)) {
            const rent = rentDue(state, p.pos, sum);
            assert.ok(rent >= 0, 'Rent must be non-negative');
            chargePlayer(p, rent, players[ownerId]);
          }
        }

        if (p.bankrupt) break;

        // Bot building phase
        for (const idx of ownedBy(state, p.id)) {
          const sp = BOARD[idx];
          if (sp.type === 'property' && canBuild(state, p.id, idx) && p.cash >= sp.houseCost + 200) {
            const ok = build(state, p.id, idx);
            if (ok) p.cash -= sp.houseCost;
          }
        }
      }
    }
  }

  const remaining = activePlayers();
  assert.ok(remaining.length >= 1, 'There must be at least one remaining player');
  assert.ok(rounds > 5, `Game must have progressed for several rounds, got ${rounds}`);
  assert.ok(totalCardsExecuted > 0, `Chance and Chest cards must have been executed, got ${totalCardsExecuted}`);

  for (const p of players) {
    if (!p.bankrupt) {
      assert.ok(p.cash >= 0, `Player ${p.name} must not have negative cash`);
      assert.ok(netWorth(state, p.id) >= p.cash, `Player ${p.name} netWorth must be >= cash`);
    }
  }

  // Check board integrity
  for (let i = 0; i < 40; i++) {
    const owner = state.owners[i];
    if (owner !== null) {
      assert.ok(owner >= 0 && owner < players.length, `Owner of tile ${i} must be valid`);
      const ownerPlayer = players[owner];
      assert.equal(ownerPlayer.bankrupt, false, `Bankrupt player cannot own tile ${i}`);
    }
  }
});
