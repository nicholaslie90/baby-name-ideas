#!/usr/bin/env node
/**
 * WRITE MODE — mutates src/data/commonNamesImported.json in place.
 *
 * For every English-only entry whose meaning gloss is FULLY translatable by the
 * offline glossary (see enrich-id-glosses.mjs), replaces meaning.id with the
 * composed Indonesian gloss. meaning.en is never touched; partial/unknown/junk
 * glosses are left as-is (English). Operates line-by-line so the diff is limited
 * to the changed meaning.id lines only.
 *
 * Run: node scripts/write-id-glosses.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { translate, JUNK } from './enrich-id-glosses.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'src', 'data', 'commonNamesImported.json');

const lines = readFileSync(file, 'utf8').split('\n');
let changed = 0;
let skippedPartial = 0;
let skippedJunk = 0;

for (let i = 0; i < lines.length - 2; i++) {
  if (lines[i].trim() !== '"meaning": {') continue;
  const idLine = lines[i + 1];
  const enLine = lines[i + 2];
  const idMatch = idLine.match(/^"id": "(.*)",$/);
  const enMatch = enLine.match(/^"en": "(.*)"$/);
  if (!idMatch || !enMatch) continue; // unexpected shape — leave untouched
  const idVal = idMatch[1];
  const enVal = enMatch[1];
  if (idVal !== enVal) continue; // already bilingual — leave it

  if (JUNK.some((j) => enVal.toLowerCase().includes(j))) {
    skippedJunk++;
    continue;
  }
  const r = translate(enVal);
  if (r.total === 0 || r.hit !== r.total) {
    skippedPartial++;
    continue;
  }
  lines[i + 1] = `"id": ${JSON.stringify(r.id)},`;
  changed++;
}

writeFileSync(file, lines.join('\n'));
console.log(`Updated meaning.id for ${changed} names → Indonesian.`);
console.log(`Left unchanged: ${skippedPartial} partial/unknown, ${skippedJunk} junk glosses.`);
