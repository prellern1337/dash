import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAkershusYields } from './akershus-yields.js';
const html=readFileSync(new URL('../tests/fixtures/akershus-segments.html',import.meta.url),'utf8');
test('actual component selects Oslo CBD, high street and logistics with declared period',()=>{
  assert.deepEqual(parseAkershusYields(html).map(r=>[r.segment,r.value,r.period]),[
    ['office',4.5,'august 2026'],['retail',4.5,'august 2026'],['logistics',5.25,'august 2026'],
  ]);
});
test('missing/invalid segment or period never copies the default office value',()=>{
  for(const broken of [html.replace('logistic-industrial','other'),html.replace('Prime yield high street','Other yield'),html.replace('Per august 2026','Unknown'),'<div>Prime yield 4.5%</div>'])assert.throws(()=>parseAkershusYields(broken));
});
