import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('mobile responsive: index.html viewport supports safe areas and eliminates tap delay', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  assert.match(html, /viewport-fit=cover/i, 'viewport-fit=cover must be set for iOS notches');
  assert.match(html, /user-scalable=no/i, 'user-scalable=no must be set to prevent mobile double-tap delays');
});

test('mobile responsive: style.css defines safe area variables and 100dvh', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf8');
  assert.match(css, /--sat:\s*env\(safe-area-inset-top/i);
  assert.match(css, /--sab:\s*env\(safe-area-inset-bottom/i);
  assert.match(css, /100dvh/i, 'Dynamic viewport height (dvh) must be defined for mobile browsers');
});

test('mobile responsive: style.css enforces 16px font-size on inputs for screens <= 768px', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf8');
  assert.match(css, /input,\s*select,\s*textarea\s*\{\s*font-size:\s*16px/i, '16px input font size prevents iOS Safari auto-zoom');
});

test('mobile responsive: sidePanelLeft has mobile toggle, backdrop, and slide-up drawer styles', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf8');
  assert.match(css, /\.sidePanelBackdrop/i, 'sidePanelBackdrop must be defined for mobile dimming');
  assert.match(css, /\.sidePanelMobileToggle/i);
  assert.match(css, /\.sidePanelMobileHandle/i);
  assert.match(css, /\.sidePanelLeft\.open/i);
});

test('mobile responsive: main.js exposes toggleSidePanel and makes scoreboard pchip clickable', () => {
  const js = fs.readFileSync(path.resolve(__dirname, '../src/main.js'), 'utf8');
  assert.match(js, /toggleSidePanel\s*\(/i, 'toggleSidePanel API must be exposed on ctx');
  assert.match(js, /sidePanelBackdrop/i, 'Backdrop element must be wired in sideAdd');
  assert.match(js, /ctx\.toggleSidePanel\?\.\(\)/i, 'Scoreboard pchips must invoke toggleSidePanel on tap');
});

test('mobile responsive: Monopoly uses persistent leftPanelBody and has dedicated dock sheet button', () => {
  const js = fs.readFileSync(path.resolve(__dirname, '../src/monopoly/index.js'), 'utf8');
  assert.match(js, /leftPanelBody/i, 'Monopoly must render inside leftPanelBody to preserve the mobile handle');
  assert.match(js, /monopolySheetBtn/i, 'Monopoly must provide a thumb-friendly button in the turn dock');
});

test('mobile responsive: spaceHub.js includes virtual touch D-pad and responsive labels', () => {
  const js = fs.readFileSync(path.resolve(__dirname, '../src/spaceHub.js'), 'utf8');
  assert.match(js, /spaceMobileDpad/i);
  assert.match(js, /dpadBtn dpadUp/i);
  assert.match(js, /enterBtnMobile/i);
});
