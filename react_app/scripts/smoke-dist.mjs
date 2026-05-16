#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const indexPath = resolve(distDir, 'index.html');
const assetsDir = resolve(distDir, 'assets');

assert.ok(existsSync(indexPath), 'dist/index.html must exist; run npm run build first');
assert.ok(existsSync(assetsDir), 'dist/assets must exist; run npm run build first');

const index = readFileSync(indexPath, 'utf8');
const assets = readdirSync(assetsDir);
assert.match(index, /\/vr-simulator\/assets\//, 'built index should preserve GitHub Pages base path');
assert.ok(assets.some((name) => name.endsWith('.js')), 'dist/assets should include JS bundle');
assert.ok(assets.some((name) => name.endsWith('.css')), 'dist/assets should include CSS bundle');
assert.equal(index.includes('VR Simulator'), true, 'HTML title should identify the app');

console.log(`SMOKE PASS: ${assets.length} built assets referenced from ${indexPath}`);
