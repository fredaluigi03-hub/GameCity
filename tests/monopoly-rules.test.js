import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD, CHANCE, CHEST} from '../src/monopoly/data.js';
import {
  START_CASH,
  GO_SALARY,
  canBuild,
  build,
  canSell,
  sellBuilding,
  mortgageValue,
  unmortgageCost,
  rentDue,
  resolveCardMovement,
  applyCard
} from '../src/monopoly/rules.js';

const state = (numPlayers = 2) => ({
  owners: Array(40).fill(null),
  houses: Array(40).fill(0),
  mortgages: new Set(),
  bank: { houses: 32, hotels: 12 },
  players: Array.from({ length: numPlayers }, (_, i) => ({ id: i, cash: START_CASH, pos: 0, jail: 0, jailCard: 0, doubles: 0, bankrupt: false })),
  current: 0
});

test('classic board has 40 spaces and starts with 1500', () => {
  assert.equal(BOARD.length, 40);
  assert.equal(BOARD[0].type, 'go');
  assert.equal(BOARD[39].name, 'Boardwalk');
  assert.equal(START_CASH, 1500);
});

test('rent doubles for a complete color group and follows house levels', () => {
  const s = state();
  s.owners[1] = s.owners[3] = 1;
  s.current = 0;
  assert.equal(rentDue(s, 1, 7), 4);
  s.houses[1] = 1;
  assert.equal(rentDue(s, 1, 7), 10);
});

test('railroads and utilities scale with ownership', () => {
  const s = state();
  s.current = 0;
  s.owners[5] = 1;
  assert.equal(rentDue(s, 5, 8), 25);
  s.owners[15] = 1;
  assert.equal(rentDue(s, 5, 8), 50);
  s.owners[12] = 1;
  assert.equal(rentDue(s, 12, 8), 32);
  s.owners[28] = 1;
  assert.equal(rentDue(s, 12, 8), 80);
  assert.equal(rentDue(s, 12, 8, { utilityMultiplier: 10 }), 80);
});

test('houses build evenly and sell for half price with inventory updates', () => {
  const s = state();
  s.owners[1] = s.owners[3] = 0;
  assert.equal(canBuild(s, 1), true);
  assert.equal(build(s, 1), true);
  assert.equal(canBuild(s, 1), false);
  assert.equal(build(s, 3), true);
  assert.equal(build(s, 1), true);
  assert.equal(canSell(s, 1), true);
  const before = s.players[0].cash;
  assert.equal(sellBuilding(s, 1), 25);
  assert.equal(s.players[0].cash, before + 25);
  assert.equal(s.bank.houses, 30);
});

test('mortgage value and redemption premium are correct', () => {
  assert.equal(mortgageValue(39), 200);
  assert.equal(unmortgageCost(39), 220);
});

test('movement cards preserve Go salary and their rent multipliers', () => {
  assert.deepEqual(resolveCardMovement(7, { nearest: 'railroad', rentMultiplier: 2 }), { position: 15, collectGo: false, rentMultiplier: 2, utilityMultiplier: null });
  assert.deepEqual(resolveCardMovement(36, { nearest: 'railroad', rentMultiplier: 2 }), { position: 5, collectGo: true, rentMultiplier: 2, utilityMultiplier: null });
  assert.deepEqual(resolveCardMovement(12, { nearest: 'utility', utilityMultiplier: 10 }), { position: 28, collectGo: false, rentMultiplier: 10, utilityMultiplier: 10 });
  assert.deepEqual(resolveCardMovement(32, { move: 0, collectGo: true }), { position: 0, collectGo: true, rentMultiplier: 1 });
  assert.deepEqual(resolveCardMovement(1, { back: 3 }), { position: 38, collectGo: false, rentMultiplier: 1 });
});

test('canBuild, canSell, build, and sellBuilding support both (index, owner) and (owner, index) signatures', () => {
  const s = state();
  s.owners[1] = s.owners[3] = 0;

  assert.equal(canBuild(s, 1, 0), true);
  assert.equal(canBuild(s, 0, 1), true);

  assert.equal(build(s, 0, 1), true);
  assert.equal(s.houses[1], 1);
  assert.equal(s.players[0].cash, START_CASH - 50);

  assert.equal(canSell(s, 1, 0), true);
  assert.equal(canSell(s, 0, 1), true);
  assert.equal(sellBuilding(s, 0, 1), 25);
  assert.equal(s.houses[1], 0);
  assert.equal(s.players[0].cash, START_CASH - 25);
});

test('Thorough unit test for ALL 16 Chance cards with full state application & destination effects', () => {
  assert.equal(CHANCE.length, 16);

  // Card 0: Avanza fino al VIA; ritira 200 $
  {
    const s = state();
    s.players[0].pos = 7;
    const res = applyCard(s, s.players[0], CHANCE[0]);
    assert.equal(res.newPosition, 0);
    assert.equal(s.players[0].pos, 0);
    assert.equal(res.collectedGo, true);
    assert.equal(s.players[0].cash, START_CASH + GO_SALARY);
  }

  // Card 1: Avanza fino a Largo Colombo (Illinois Avenue, pos 24)
  {
    // Case A: from Chance tile 7 (no GO passage)
    const s = state();
    s.players[0].pos = 7;
    const res = applyCard(s, s.players[0], CHANCE[1]);
    assert.equal(res.newPosition, 24);
    assert.equal(s.players[0].pos, 24);
    assert.equal(res.collectedGo, false);
    assert.equal(s.players[0].cash, START_CASH);

    // Case B: from Chance tile 36 (passes GO -> +200 $)
    const s2 = state();
    s2.players[0].pos = 36;
    const res2 = applyCard(s2, s2.players[0], CHANCE[1]);
    assert.equal(res2.newPosition, 24);
    assert.equal(res2.collectedGo, true);
    assert.equal(s2.players[0].cash, START_CASH + GO_SALARY);

    // Case C: landing on Largo Colombo owned by Player 1 with 3 houses
    const s3 = state();
    s3.owners[24] = 1;
    s3.houses[24] = 3;
    s3.current = 0;
    const res3 = applyCard(s3, s3.players[0], CHANCE[1]);
    assert.equal(res3.newPosition, 24);
    assert.equal(res3.rentDue, 750); // Largo Colombo 3 houses rent is 750
    assert.equal(res3.rentOwner, 1);

    // Case D: mortgaged property -> 0 rent
    s3.mortgages.add(24);
    const res4 = applyCard(s3, s3.players[0], CHANCE[1]);
    assert.equal(res4.rentDue, 0);
  }

  // Card 2: Avanza fino a Via Accademia (pos 11)
  {
    const s = state();
    s.players[0].pos = 22; // From tile 22 to 11 passes GO
    const res = applyCard(s, s.players[0], CHANCE[2]);
    assert.equal(res.newPosition, 11);
    assert.equal(res.collectedGo, true);
    assert.equal(s.players[0].cash, START_CASH + GO_SALARY);
  }

  // Card 3: Avanza fino alla stazione più vicina (railroad, rent x2)
  {
    const s = state();
    s.players[0].pos = 7; // nearest railroad is 15 (Stazione Ovest)
    s.owners[15] = 1; // player 1 owns 1 railroad -> base 25, multiplied x2 = 50
    const res = applyCard(s, s.players[0], CHANCE[3]);
    assert.equal(res.newPosition, 15);
    assert.equal(res.rentDue, 50);

    // From tile 36 -> nearest is tile 5 (Stazione Sud), passes GO
    const s2 = state();
    s2.players[0].pos = 36;
    const res2 = applyCard(s2, s2.players[0], CHANCE[3]);
    assert.equal(res2.newPosition, 5);
    assert.equal(res2.collectedGo, true);
  }

  // Card 4: Avanza fino alla società di servizi più vicina (utility, dice x 10)
  {
    const s = state();
    s.players[0].pos = 7; // nearest utility is 12 (Società Elettrica)
    s.owners[12] = 1;
    const res = applyCard(s, s.players[0], CHANCE[4], 8); // diceTotal 8
    assert.equal(res.newPosition, 12);
    assert.equal(res.rentDue, 80); // 8 * 10 = 80
  }

  // Card 5: La banca ti paga un dividendo di 50 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHANCE[5]);
    assert.equal(res.cashDelta, 50);
    assert.equal(s.players[0].cash, START_CASH + 50);
    assert.equal(res.moved, false);
  }

  // Card 6: Uscita gratis di prigione
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHANCE[6]);
    assert.equal(res.jailCard, true);
    assert.equal(s.players[0].jailCard, 1);
  }

  // Card 7: Fai 3 passi indietro
  {
    const s = state();
    s.players[0].pos = 7;
    const res = applyCard(s, s.players[0], CHANCE[7]);
    assert.equal(res.newPosition, 4); // 7 - 3 = 4 (Tassa Patrimoniale)
    assert.equal(res.collectedGo, false);
  }

  // Card 8: Va dritto in prigione senza passare dal Via
  {
    const s = state();
    s.players[0].pos = 36;
    const res = applyCard(s, s.players[0], CHANCE[8]);
    assert.equal(res.newPosition, 10);
    assert.equal(s.players[0].pos, 10);
    assert.equal(s.players[0].jail, 1);
    assert.equal(s.players[0].doubles, 0);
    assert.equal(s.players[0].cash, START_CASH); // no salary
  }

  // Card 9: Lavori di ristrutturazione: 25 $ per casa, 100 $ per hotel
  {
    const s = state();
    s.owners[1] = 0; s.houses[1] = 3; // 3 houses = 75
    s.owners[3] = 0; s.houses[3] = 5; // 1 hotel = 100
    const res = applyCard(s, s.players[0], CHANCE[9]);
    assert.equal(res.cashDelta, -175);
    assert.equal(s.players[0].cash, START_CASH - 175);
  }

  // Card 10: Multa per eccesso di velocità: paga 15 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHANCE[10]);
    assert.equal(res.cashDelta, -15);
    assert.equal(s.players[0].cash, START_CASH - 15);
  }

  // Card 11: Fai un viaggio alla Stazione Sud (pos 5)
  {
    const s = state();
    s.players[0].pos = 7; // From 7 to 5 passes GO
    const res = applyCard(s, s.players[0], CHANCE[11]);
    assert.equal(res.newPosition, 5);
    assert.equal(res.collectedGo, true);
    assert.equal(s.players[0].cash, START_CASH + GO_SALARY);
  }

  // Card 12: Raggiungi Parco della Vittoria (pos 39)
  {
    const s = state();
    s.players[0].pos = 7;
    const res = applyCard(s, s.players[0], CHANCE[12]);
    assert.equal(res.newPosition, 39);
    assert.equal(res.collectedGo, false);
  }

  // Card 13: Sei stato eletto presidente: paga 50 $ a ogni giocatore
  {
    const s = state(4); // 4 players: player 0 pays 3 others * 50 = 150
    const res = applyCard(s, s.players[0], CHANCE[13]);
    assert.equal(res.cashDelta, -150);
    assert.equal(s.players[0].cash, START_CASH - 150);
    assert.equal(s.players[1].cash, START_CASH + 50);
    assert.equal(s.players[2].cash, START_CASH + 50);
    assert.equal(s.players[3].cash, START_CASH + 50);
  }

  // Card 14: Matura il tuo fondo pensione: incassa 150 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHANCE[14]);
    assert.equal(res.cashDelta, 150);
    assert.equal(s.players[0].cash, START_CASH + 150);
  }

  // Card 15: Paga spese di consulenza: 50 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHANCE[15]);
    assert.equal(res.cashDelta, -50);
    assert.equal(s.players[0].cash, START_CASH - 50);
  }
});

test('Thorough unit test for ALL 16 Community Chest cards with full state application', () => {
  assert.equal(CHEST.length, 16);

  // Card 0: Avanza fino al VIA; ritira 200 $
  {
    const s = state();
    s.players[0].pos = 17;
    const res = applyCard(s, s.players[0], CHEST[0]);
    assert.equal(res.newPosition, 0);
    assert.equal(s.players[0].pos, 0);
    assert.equal(res.collectedGo, true);
    assert.equal(s.players[0].cash, START_CASH + GO_SALARY);
  }

  // Card 1: Errore bancario a tuo favore: ritira 200 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[1]);
    assert.equal(res.cashDelta, 200);
    assert.equal(s.players[0].cash, START_CASH + 200);
  }

  // Card 2: Parcella del dottore: paga 50 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[2]);
    assert.equal(res.cashDelta, -50);
    assert.equal(s.players[0].cash, START_CASH - 50);
  }

  // Card 3: Vendita di azioni: incassa 50 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[3]);
    assert.equal(res.cashDelta, 50);
    assert.equal(s.players[0].cash, START_CASH + 50);
  }

  // Card 4: Uscita gratis di prigione
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[4]);
    assert.equal(res.jailCard, true);
    assert.equal(s.players[0].jailCard, 1);
  }

  // Card 5: Va dritto in prigione senza passare dal Via
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[5]);
    assert.equal(res.newPosition, 10);
    assert.equal(s.players[0].jail, 1);
  }

  // Card 6: Fondo vacanze maturato: ricevi 100 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[6]);
    assert.equal(res.cashDelta, 100);
    assert.equal(s.players[0].cash, START_CASH + 100);
  }

  // Card 7: Rimborso tasse: ricevi 20 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[7]);
    assert.equal(res.cashDelta, 20);
    assert.equal(s.players[0].cash, START_CASH + 20);
  }

  // Card 8: È il tuo compleanno: ricevi 10 $ da ogni giocatore
  {
    const s = state(4); // 4 players: receives 10 from each of the 3 others = +30
    const res = applyCard(s, s.players[0], CHEST[8]);
    assert.equal(res.cashDelta, 30);
    assert.equal(s.players[0].cash, START_CASH + 30);
    assert.equal(s.players[1].cash, START_CASH - 10);
    assert.equal(s.players[2].cash, START_CASH - 10);
    assert.equal(s.players[3].cash, START_CASH - 10);
  }

  // Card 9: Polizza vita maturata: ricevi 100 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[9]);
    assert.equal(res.cashDelta, 100);
    assert.equal(s.players[0].cash, START_CASH + 100);
  }

  // Card 10: Spese ospedaliere: paga 100 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[10]);
    assert.equal(res.cashDelta, -100);
    assert.equal(s.players[0].cash, START_CASH - 100);
  }

  // Card 11: Rette scolastiche: paga 50 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[11]);
    assert.equal(res.cashDelta, -50);
    assert.equal(s.players[0].cash, START_CASH - 50);
  }

  // Card 12: Ricevi compenso professionale di 25 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[12]);
    assert.equal(res.cashDelta, 25);
    assert.equal(s.players[0].cash, START_CASH + 25);
  }

  // Card 13: Migliorie stradali: paga 40 $ per casa, 115 $ per hotel
  {
    const s = state();
    s.owners[1] = 0; s.houses[1] = 2; // 2 houses = 80
    s.owners[3] = 0; s.houses[3] = 5; // 1 hotel = 115
    const res = applyCard(s, s.players[0], CHEST[13]);
    assert.equal(res.cashDelta, -195);
    assert.equal(s.players[0].cash, START_CASH - 195);
  }

  // Card 14: Hai vinto il secondo premio di bellezza: ritira 10 $
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[14]);
    assert.equal(res.cashDelta, 10);
    assert.equal(s.players[0].cash, START_CASH + 10);
  }

  // Card 15: Erediti 100 $ da un lontano zio
  {
    const s = state();
    const res = applyCard(s, s.players[0], CHEST[15]);
    assert.equal(res.cashDelta, 100);
    assert.equal(s.players[0].cash, START_CASH + 100);
  }
});
