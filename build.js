#!/usr/bin/env node
// Build script: copies the extension files into build/{chrome,firefox}/,
// picks the right manifest, and (optionally) zips the result.
//
// Usage: node build.js <target> [--zip]
//   target: chrome | brave | firefox | all
//   --zip:  also write a zip alongside

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT = __dirname;
const args = process.argv.slice(2);
const target = (args[0] || 'all').toLowerCase();
const zip = args.includes('--zip');

const targets = target === 'all'
  ? ['chrome', 'brave', 'firefox']
  : [target];

const SHARED = ['src', 'icons', 'manifest.json'];

function buildChromeOrBrave(name) {
  const out = path.join(ROOT, 'build', name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const item of SHARED) {
    copyRecursive(path.join(ROOT, item), path.join(out, item));
  }
  console.log(`✓ ${name} → ${out}`);
  if (zip) makeZip(out, name);
}

function buildFirefox() {
  const out = path.join(ROOT, 'build', 'firefox');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  // Firefox uses the .firefox manifest
  copyRecursive(path.join(ROOT, 'src'), path.join(out, 'src'));
  copyRecursive(path.join(ROOT, 'icons'), path.join(out, 'icons'));
  fs.copyFileSync(
    path.join(ROOT, 'manifest.firefox.json'),
    path.join(out, 'manifest.json')
  );
  console.log(`✓ firefox → ${out}`);
  if (zip) makeZip(out, 'firefox');
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function makeZip(dir, name) {
  const zipPath = path.join(ROOT, 'build', `esystem-${name}-0.1.0.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => console.log(`  zip → ${zipPath} (${archive.pointer()} bytes)`));
  archive.on('error', (err) => { throw err; });
  archive.pipe(output);
  archive.directory(dir, false);
  archive.finalize();
}

for (const t of targets) {
  if (t === 'firefox') buildFirefox();
  else buildChromeOrBrave(t);
}
