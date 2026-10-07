import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoverNewsecPdf, parseNewsecTable, pdfCandidates, quarterPeriod } from './newsec-yields.js';
const q3=readFileSync(new URL('../tests/fixtures/newsec-q3-2026.txt',import.meta.url),'utf8');
const link=(q,url='https://cdn.sanity.io/hashed.pdf')=>`<a href="${url}">Yieldtabell Q${q}-2026</a>`;
const fixtures={
  'https://www.newsec.no/insights/reports/yieldtabell':link(2,'https://cdn.sanity.io/old.pdf'),
  'https://www.newsec.no/insights/reports':'<h1>Reports</h1>',
  'https://www.newsec.no/sitemap.xml':'<urlset><url><loc>https://www.newsec.no/insights/reports/quality-board-q3-2026/</loc></url></urlset>',
  'https://www.newsec.no/insights/reports/quality-board-q3-2026':link(3),
};
const load=async url=>{if(!(url in fixtures))throw new Error('404');return fixtures[url];};

test('stale yield page plus sitemap discovers hashed Q3 PDF on Quality Board',async()=>{
  const candidate=await discoverNewsecPdf({fetchText:load});
  assert.equal(candidate.period,'Q3 2026');
  assert.equal(candidate.pageUrl,'https://www.newsec.no/insights/reports/quality-board-q3-2026');
  assert.deepEqual(parseNewsecTable(q3,candidate).map(r=>[r.segment,r.value,r.period]),[
    ['office',4.5,'Q3 2026'],['retail',5.25,'Q3 2026'],['logistics',5.25,'Q3 2026'],
  ]);
});
test('future quarters are discovered without hardcoded Q3 link',async()=>{
  const fetchText=async url=>url.endsWith('/sitemap.xml')?'<loc>https://www.newsec.no/insights/reports/quality-board-q4-2026/</loc>':url.endsWith('q4-2026')?link(4):load(url);
  assert.equal((await discoverNewsecPdf({fetchText})).period,'Q4 2026');
});
test('newest report failure or missing table never silently falls back to Q2',async()=>{
  for(const replacement of [async()=>{throw new Error('upstream failure');},async()=>'<a href="https://cdn.sanity.io/rent.pdf">Markedsleier Q3-2026</a>']) {
    await assert.rejects(discoverNewsecPdf({fetchText:async url=>url.endsWith('q3-2026')?replacement():load(url)}));
  }
  await assert.rejects(discoverNewsecPdf({fetchText:async url=>url.endsWith('/yieldtabell')?link(2):''}));
});
test('only trusted dated yield PDFs; unrelated report PDFs and foreign URLs excluded',()=>{
  const candidates=pdfCandidates(link(3)+'<a href="https://example.com/fake.pdf">Yieldtabell Q4-2026</a><a href="https://cdn.sanity.io/rent.pdf">Markedsleier Q4-2026</a>','https://www.newsec.no');
  assert.equal(candidates.length,1);
});
test('PDF period mismatch, incomplete rows and reversed low/high are rejected',()=>{
  const candidate={url:'url',label:'Yieldtabell Q3 2026',...quarterPeriod('Q3 2026')};
  assert.throws(()=>parseNewsecTable(q3,{...candidate,rank:quarterPeriod('Q4 2026').rank}));
  assert.throws(()=>parseNewsecTable(q3.replace('Retail Prime5,25 %6,00 %','Retail Prime'),candidate));
  assert.throws(()=>parseNewsecTable(q3.replace('Office Oslo CBD 4,50 %','Office Oslo CBD 22,50 %'),candidate));
  assert.throws(()=>parseNewsecTable(q3.replace('5,25 %6,00 %\nRetail Normal','7,25 %6,00 %\nRetail Normal'),candidate));
});
