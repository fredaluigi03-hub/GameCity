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
