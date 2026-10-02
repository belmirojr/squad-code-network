#!/usr/bin/env node
// Regenerates src/vendor/three.min.js (global THREE, only the classes in three-entry.js).
// Runs in a temporary folder so the project keeps zero runtime dependencies:
//   node scripts/vendor-three.mjs [version]
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] || '0.186.1';
const work = mkdtempSync(path.join(tmpdir(), 'squad-three-'));
const run = cmd => execSync(cmd, { cwd: work, stdio: 'inherit', shell: true });
try {
  writeFileSync(path.join(work, 'package.json'), '{"name":"vendor","private":true}');
  run(`npm install --no-audit --no-fund --silent three@${version} esbuild@0.25`);
  copyFileSync(path.join(ROOT, 'scripts', 'three-entry.js'), path.join(work, 'entry.js'));
  mkdirSync(path.join(ROOT, 'src', 'vendor'), { recursive: true });
  const out = path.join(ROOT, 'src', 'vendor', 'three.min.js');
  run(`npx esbuild entry.js --bundle --minify --format=iife --global-name=THREE --target=es2020 --legal-comments=none --outfile="${out}"`);
  const license = readFileSync(path.join(work, 'node_modules', 'three', 'LICENSE'), 'utf8').split('\n').find(l => /copyright/i.test(l)) || 'three.js authors';
  writeFileSync(out, `/* three.js r${version.split('.')[1]} (${version}) | MIT License | ${license.trim()} | https://threejs.org */\n` + readFileSync(out, 'utf8'));
  console.log(`three@${version} -> src/vendor/three.min.js (${Math.round(statSync(out).size / 1024)} KB)`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
