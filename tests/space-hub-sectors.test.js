import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('spaceHub 3-Hub architecture: defines 3 main portals (Show Game, Giochi da Tavolo, Random & Finali)', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');

  // Verify SECTORS definition
  assert.match(code, /SECTORS\s*=\s*\{/i);
  assert.match(code, /id:\s*['"]shows['"]/);
  assert.match(code, /id:\s*['"]boardgames['"]/);
  assert.match(code, /id:\s*['"]random['"]/);

  // Main hub kicker and title
  assert.match(code, /SHOW GAME TV/);
  assert.match(code, /GIOCHI DA TAVOLO/);
  assert.match(code, /RANDOM & FINALI/);
});

test('spaceHub sectors: shows sector contains all 5 iconic prime-time TV shows', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');
  assert.match(code, /shows:\s*\{[^}]*itemIds:\s*\[['"]eredita['"],\s*['"]avanti['"],\s*['"]caduta['"],\s*['"]affari['"],\s*['"]catena['"]\]/s);
});

test('spaceHub sectors: boardgames sector contains all 5 3D multiplayer board games', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');
  assert.match(code, /boardgames:\s*\{[^}]*itemIds:\s*\[['"]monopoly['"],\s*['"]tombola['"],\s*['"]bingo['"],\s*['"]ouija['"],\s*['"]forza4['"]\]/s);
});

test('spaceHub sectors: random sector contains minigames and direct access to TV show final rounds', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');

  // Minigames
  assert.match(code, /['"]fight['"]/);
  assert.match(code, /['"]cultura['"]/);
  assert.match(code, /['"]hit['"]/);
  assert.match(code, /['"]math['"]/);

  // Standalone Final Rounds
  assert.match(code, /['"]eredita_finale['"]/);
  assert.match(code, /['"]avanti_finale['"]/);
  assert.match(code, /['"]caduta_finale['"]/);
  assert.match(code, /['"]affari_finale['"]/);
  assert.match(code, /['"]catena_finale['"]/);

  // Verify finalOnly flag
  assert.match(code, /finalOnly:\s*true/);
});

test('spaceHub navigation: arrows rotate in correct visual direction', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');

  // Verify rotateRight turns to visual right (sel - 1 in Three.js outward view)
  assert.match(code, /function\s+rotateRight\s*\(\)\s*\{[^}]*rotateTo\(sel\s*-\s*1\)/s);
  // Verify rotateLeft turns to visual left (sel + 1 in Three.js outward view)
  assert.match(code, /function\s+rotateLeft\s*\(\)\s*\{[^}]*rotateTo\(sel\s*\+\s*1\)/s);

  // Verify button wiring
  assert.match(code, /nextDoorBtn\.onclick[^}]*rotateRight\(\)/);
  assert.match(code, /prevDoorBtn\.onclick[^}]*rotateLeft\(\)/);
  assert.match(code, /next\.onclick\s*=\s*\(\)\s*=>\s*rotateRight\(\)/);
  assert.match(code, /prev\.onclick\s*=\s*\(\)\s*=>\s*rotateLeft\(\)/);
});

test('spaceHub back navigation: provides Torna alle 3 Porte button when in a sub-sector', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');
  assert.match(code, /backHubPill/);
  assert.match(code, /Torna alle 3 Porte/);
  assert.match(code, /switchToSector\(['"]main['"]\)/);
  assert.match(code, /backToHubCardBtn/);
});
