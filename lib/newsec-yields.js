import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const NEWSEC_YIELD_PAGE = 'https://www.newsec.no/insights/reports/yieldtabell';
const REPORTS = 'https://www.newsec.no/insights/reports';
const SITEMAP = 'https://www.newsec.no/sitemap.xml';
const textOnly = s => String(s).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();

export function quarterPeriod(value) {
  // PDF extraction may merge adjacent quarter headings: Q3 2025Q4 2025.
  const match = String(value).match(/Q\s*([1-4])\s*[-/]?\s*(20\d{2})/i);
  return match ? { label:`Q${match[1]} ${match[2]}`, rank:Number(match[2])*4+Number(match[1]) } : null;
}
function safeUrl(raw, base) {
  try {
    const url = new URL(raw.replace(/\\\//g,'/').replace(/&amp;/g,'&'),base);
    if (url.protocol !== 'https:' || !['www.newsec.no','newsec.no','cdn.sanity.io'].includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}
export function pdfCandidates(html, pageUrl) {
  const results = new Map();
  for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url=safeUrl(match[1],pageUrl), label=textOnly(match[2]);
    if (!url || !/\.pdf(?:[?#]|$)/i.test(url) || !/yield(?:tabell|[- ]?table)?/i.test(label+' '+url)) continue;
    const period=quarterPeriod(label) || quarterPeriod(url);
    if(period) results.set(url,{url,label:label||`Yieldtabell ${period.label}`,period:period.label,rank:period.rank,pageUrl});
  }
  return [...results.values()];
}
export function reportCandidates(html, pageUrl) {
  const urls = new Set();
  // Covers XML <loc>, HTML links and escaped CMS payloads without guessing a new quarter URL.
  const decoded=html.replace(/\\\//g,'/');
  for(const m of decoded.matchAll(/(?:https:\/\/(?:www\.)?newsec\.no)?\/insights\/reports\/[a-z0-9-]*(?:quality-board|yieldtabell)[a-z0-9-]*\/?/gi)) {
    const url=safeUrl(m[0],pageUrl);
    if(url && quarterPeriod(url)) urls.add(url.replace(/\/$/,''));
  }
  return [...urls].map(url=>({url,rank:quarterPeriod(url).rank})).sort((a,b)=>b.rank-a.rank);
}
export async function newsecText(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{Accept:'text/html,application/xml', 'User-Agent':'MarketDashboardPWA/1.0','Cache-Control':'no-cache'}});
  if(!response.ok)throw new Error(`Newsec HTTP ${response.status}`);
  return response.text();
}
export async function discoverNewsecPdf({fetchText=newsecText}={}) {
  const roots=[NEWSEC_YIELD_PAGE,REPORTS,SITEMAP];
  const responses=await Promise.allSettled(roots.map(url=>fetchText(url)));
  const pdfs=[],reports=[];
  let discoveryAvailable=false;
  responses.forEach((r,i)=>{
    if(r.status!=='fulfilled')return;
    pdfs.push(...pdfCandidates(r.value,roots[i]));
    const found=reportCandidates(r.value,roots[i]);reports.push(...found);
    if(i>0 && found.length)discoveryAvailable=true;
  });
  if(!discoveryAvailable)throw new Error('Newsec report discovery unavailable; refusing to silently use the old yield page');
  const uniqueReports=[...new Map(reports.map(r=>[r.url,r])).values()].sort((a,b)=>b.rank-a.rank);
  // A bounded crawl of the newest three reports; reject failed newest pages rather than regress.
  const newestRank=uniqueReports[0].rank;
  const pages=await Promise.allSettled(uniqueReports.slice(0,3).map(r=>fetchText(r.url)));
  pages.forEach((r,i)=>{
    if(r.status==='fulfilled')pdfs.push(...pdfCandidates(r.value,uniqueReports[i].url));
  });
  const sorted=pdfs.sort((a,b)=>b.rank-a.rank);
  if(!sorted.length)throw new Error('No dated Newsec yield PDF discovered');
  if(sorted[0].rank<newestRank)throw new Error('Newest Newsec report has no readable yield table; refusing older PDF');
  return sorted[0];
}

export function parseNewsecTable(text, candidate) {
  const clean=String(text).replace(/\u0000/g,' ').replace(/\s+/g,' ').trim();
  const header=clean.split(/Office Oslo CBD/i)[0];
  const quarters=[...header.matchAll(/Q\s*([1-4])\s*[-/]?\s*(20\d{2})/gi)].map(m=>quarterPeriod(m[0]));
  if(!quarters.length)throw new Error('Missing Newsec quarter headers');
  for(let i=1;i<quarters.length;i++)if(quarters[i].rank<=quarters[i-1].rank)throw new Error('Newsec quarter columns out of order');
  const latest=quarters.at(-1);
  if(latest.rank!==candidate.rank)throw new Error('Newsec PDF period does not match report link');
  const labels={office:'Office Oslo CBD',retail:'Retail Prime',logistics:'Logistics Prime'};
  return Object.entries(labels).map(([segment,label])=>{
    const start=clean.toLowerCase().indexOf(label.toLowerCase());
    if(start<0)throw new Error(`Missing Newsec row ${label}`);
    const remaining=clean.slice(start+label.length);
    const end=remaining.search(/Office Oslo|Office Stavanger|Office Bergen|Office Trondheim|Office Other|Retail|Logistics|Hotel|Residential|Newsec Quality Board/i);
    const row=end<0?remaining:remaining.slice(0,end);
    const values=[...row.matchAll(/(\d+(?:[,.]\d+)?)\s*%/g)].map(m=>Number(m[1].replace(',','.')));
    if(values.length!==quarters.length*2 || values.some(v=>!(v>0&&v<20)))throw new Error(`Invalid Newsec row columns: ${label}`);
    if(values.at(-2)>values.at(-1))throw new Error(`Newsec Low exceeds High: ${label}`);
    return {source:'newsec',segment,value:values.at(-2),period:latest.label,
      sourceName:'Newsec Yieldtabell',sourceUrl:candidate.url,sourceDocument:candidate.label,
      discoveryPage:candidate.pageUrl,method:'newsec_report_discovery_pdf'};
  });
}
export async function fetchNewsecYields({fetchText=newsecText,fetchPdf,parsePdf}={}) {
  const candidate=await discoverNewsecPdf({fetchText});
  const buffer=fetchPdf ? await fetchPdf(candidate.url) : await (async()=>{
    const response=await fetch(candidate.url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/pdf','Cache-Control':'no-cache'}});
    if(!response.ok)throw new Error(`Newsec PDF HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  })();
  const parsed=await (parsePdf || require('pdf-parse/lib/pdf-parse.js'))(buffer);
  return parseNewsecTable(parsed.text,candidate);
}
