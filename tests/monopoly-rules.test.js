import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD} from '../src/monopoly/data.js';
import {START_CASH, canBuild, build, canSell, sellBuilding, mortgageValue, unmortgageCost, rentDue, resolveCardMovement} from '../src/monopoly/rules.js';

const state=()=>({owners:Array(40).fill(null),houses:Array(40).fill(0),mortgages:new Set(),bank:{houses:32,hotels:12},players:[{cash:START_CASH},{cash:START_CASH}],current:0});

test('classic board has 40 spaces and starts with 1500',()=>{
  assert.equal(BOARD.length,40);assert.equal(BOARD[0].type,'go');assert.equal(BOARD[39].name,'Boardwalk');assert.equal(START_CASH,1500);
});
test('rent doubles for a complete color group and follows house levels',()=>{
  const s=state();s.owners[1]=s.owners[3]=1;s.current=0;
  assert.equal(rentDue(s,1,7),4);s.houses[1]=1;assert.equal(rentDue(s,1,7),10);
});
test('railroads and utilities scale with ownership',()=>{
  const s=state();s.current=0;s.owners[5]=1;assert.equal(rentDue(s,5,8),25);
  s.owners[15]=1;assert.equal(rentDue(s,5,8),50);s.owners[12]=1;
  assert.equal(rentDue(s,12,8),32);s.owners[28]=1;assert.equal(rentDue(s,12,8),80);
  assert.equal(rentDue(s,12,8,10),80);
});
test('houses build evenly and sell for half price with inventory updates',()=>{
  const s=state();s.owners[1]=s.owners[3]=0;
  assert.equal(canBuild(s,1),true);assert.equal(build(s,1),true);assert.equal(canBuild(s,1),false);
  assert.equal(build(s,3),true);assert.equal(build(s,1),true);assert.equal(canSell(s,1),true);
  const before=s.players[0].cash;assert.equal(sellBuilding(s,1),25);assert.equal(s.players[0].cash,before+25);
  assert.equal(s.bank.houses,30);
});
test('mortgage value and redemption premium are correct',()=>{
  assert.equal(mortgageValue(39),200);assert.equal(unmortgageCost(39),220);
});
test('movement cards preserve Go salary and their rent multipliers',()=>{
  assert.deepEqual(resolveCardMovement(7,{nearest:'railroad',rentMultiplier:2}),{position:15,collectGo:false,rentMultiplier:2});
  assert.deepEqual(resolveCardMovement(36,{nearest:'railroad',rentMultiplier:2}),{position:5,collectGo:true,rentMultiplier:2});
  assert.deepEqual(resolveCardMovement(12,{nearest:'utility',utilityMultiplier:10}),{position:28,collectGo:false,rentMultiplier:10});
  assert.deepEqual(resolveCardMovement(32,{move:0,collectGo:true}),{position:0,collectGo:true,rentMultiplier:1});
  assert.deepEqual(resolveCardMovement(1,{back:3}),{position:38,collectGo:false,rentMultiplier:1});
});

test('all 16 CHANCE and 16 CHEST cards are well-formed and resolve mechanics correctly', async () => {
  const { CHANCE, CHEST } = await import('../src/monopoly/data.js');
  assert.equal(CHANCE.length, 16, 'Must have exactly 16 Chance cards');
  assert.equal(CHEST.length, 16, 'Must have exactly 16 Community Chest cards');

  // Verify Colombo card
  const colomboCard = CHANCE.find(c => c.text.includes('Colombo'));
  assert.ok(colomboCard, 'Card for Largo Colombo must exist');
  assert.equal(colomboCard.move, 24, 'Largo Colombo tile index is 24');

  const mvFrom7 = resolveCardMovement(7, colomboCard);
  assert.equal(mvFrom7.position, 24);
  assert.equal(mvFrom7.collectGo, false);

  const mvFrom36 = resolveCardMovement(36, colomboCard);
  assert.equal(mvFrom36.position, 24);
  assert.equal(mvFrom36.collectGo, true);

  // Check every card has valid text and at least one actionable effect
  [...CHANCE, ...CHEST].forEach((card, idx) => {
    assert.ok(typeof card.text === 'string' && card.text.length > 5, `Card ${idx} must have text`);
    const hasAction = card.move !== undefined || card.back !== undefined || card.nearest !== undefined ||
                      card.cash !== undefined || card.jail !== undefined || card.jailCard !== undefined ||
                      card.payEach !== undefined || card.collectEach !== undefined || card.repair !== undefined;
    assert.ok(hasAction, `Card "${card.text}" must have a recognized gameplay action`);
  });
});

test('canBuild, canSell, build, and sellBuilding support both (index, owner) and (owner, index) signatures', () => {
  const s = state();
  s.owners[1] = s.owners[3] = 0; // Brown group owned by player 0

  // Standard signature (state, index, owner)
  assert.equal(canBuild(s, 1, 0), true);
  // Inverted signature (state, owner, index)
  assert.equal(canBuild(s, 0, 1), true);

  // Build via inverted signature
  assert.equal(build(s, 0, 1), true);
  assert.equal(s.houses[1], 1);
  assert.equal(s.players[0].cash, START_CASH - 50);

  // Check sell with both signatures
  assert.equal(canSell(s, 1, 0), true);
  assert.equal(canSell(s, 0, 1), true);
  assert.equal(sellBuilding(s, 0, 1), 25);
  assert.equal(s.houses[1], 0);
  assert.equal(s.players[0].cash, START_CASH - 25);
});
