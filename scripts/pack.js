#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dl-subtitles.zip');

const INCLUDE = [
  'manifest.json',
  'README.md',
  'icons',
  'dist',
  'src/options',
  'src/content/content.css',
  'docs/privacy-policy.html',
];

// Pure Node.js zip using only built-in modules
// Uses the DEFLATE algorithm via zlib
const zlib = require('zlib');

function readDir(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...readDir(full));
    else results.push(full);
  }
  return results;
}

function collectFiles() {
  const files = [];
  for (const item of INCLUDE) {
    const full = path.join(ROOT, item);
    if (!fs.existsSync(full)) { console.warn(`  skip (not found): ${item}`); continue; }
    if (fs.statSync(full).isDirectory()) {
      for (const f of readDir(full)) {
        files.push({ abs: f, rel: path.relative(ROOT, f) });
      }
    } else {
      files.push({ abs: full, rel: item });
    }
  }
  return files;
}

// Minimal ZIP writer (store + deflate)
function writeZip(outPath, files) {
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const { abs, rel } of files) {
    const name = Buffer.from(rel.replace(/\\/g, '/'));
    const data = fs.readFileSync(abs);
    const compressed = zlib.deflateRawSync(data, { level: 6 });
    const useDeflate = compressed.length < data.length;
    const payload = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;

    // CRC-32
    const crc = crc32(data);
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    // Local file header
    const lh = Buffer.alloc(30 + name.length);
    lh.writeUInt32LE(0x04034b50, 0);   // signature
    lh.writeUInt16LE(20, 4);            // version needed
    lh.writeUInt16LE(0, 6);             // flags
    lh.writeUInt16LE(method, 8);        // compression
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(payload.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    name.copy(lh, 30);

    parts.push(lh, payload);

    // Central directory entry
    const cd = Buffer.alloc(46 + name.length);
    cd.writeUInt32LE(0x02014b50, 0);   // signature
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(dosTime, 12);
    cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    name.copy(cd, 46);
    centralDir.push(cd);

    offset += lh.length + payload.length;
  }

  const cdBuf = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralDir.length, 8);
  eocd.writeUInt16LE(centralDir.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.writeFileSync(outPath, Buffer.concat([...parts, cdBuf, eocd]));
}

// CRC-32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Main
const files = collectFiles();
writeZip(OUT, files);

const size = fs.statSync(OUT).size;
console.log(`\n✅ dl-subtitles.zip (${(size / 1024).toFixed(1)} KB)`);
for (const { rel } of files) console.log(`   ${rel}`);
console.log(`\nOutput: ${OUT}\n`);
