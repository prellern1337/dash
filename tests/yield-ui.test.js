import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const temp = await mkdtemp(new URL('../.yield-ui-', import.meta.url).pathname);
let components;
try {
  const outfile = join(temp, 'App.mjs');
  await build({ entryPoints: [new URL('../src/App.jsx', import.meta.url).pathname], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  components = await import(pathToFileURL(outfile));
} finally {
  await rm(temp, { recursive: true, force: true });
}

test('rendered observation pairs the unchanged number with its own period', () => {
  for (const [value, period, formatted] of [[4.75, 'mai 2026', '4,75'], [5.25, 'mars 2026', '5,25'], [4.5, 'Q3 2026', '4,50'], [4.5, 'oktober 2026', '4,50']]) {
    const html = renderToStaticMarkup(React.createElement(components.YieldObservation, { observation: { value, period } }));
    assert.ok(html.includes(period));
    assert.ok(html.includes(formatted));
  }
});

test('rendered missing period is explicit and mixed average lists both source periods', () => {
  const html = renderToStaticMarkup(React.createElement(components.YieldObservation, { observation: { value: 5 } }));
  assert.ok(html.includes('Periode ikke oppgitt'));
  const summary = renderToStaticMarkup(React.createElement(components.YieldAverageDetails, { segment: { sources: {
    newsec: { source: 'Newsec', value: 4.5, period: 'Q3 2026' },
    akershus: { source: 'Akershus', value: 4.5, period: 'oktober 2026' },
  } } }));
  assert.ok(summary.includes('ikke et samtidig markedsnivå'));
  assert.ok(summary.includes('Newsec: Q3 2026'));
  assert.ok(summary.includes('Akershus: oktober 2026'));
});
