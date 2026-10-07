import { extractAkershusPeriod } from './yield-period.js';
const URL = 'https://akershuseiendom.no/markedsinnsikt/nokkeltall';
function decode(value) {
  return value.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}
export function parseAkershusYields(html) {
  const tag=html.match(/<segment-dive-component\b[\s\S]*?>/i)?.[0];
  if(!tag)throw new Error('Akershus segment data missing');
  const dataAttr=tag.match(/\bdata\s*=\s*"([^"]*)"/i)?.[1];
  const updated=decode(tag.match(/\bupdated\s*=\s*"([^"]*)"/i)?.[1] || '');
  const period=extractAkershusPeriod(updated);
  if(!dataAttr || !period)throw new Error('Akershus segment data/period missing');
  let raw=decode(dataAttr);
  // Site wraps the JSON object in one additional brace pair for its component binding.
  if(raw.startsWith('{{')&&raw.endsWith('}}'))raw=raw.slice(1,-1);
  const data=JSON.parse(raw);
  return [
    ['office',data.office?.sections?.oslo?.figures,'Prime yield','Kontor Oslo'],
    ['retail',data.retail?.figures,'Prime yield high street','Handel high street'],
    ['logistics',data['logistic-industrial']?.figures,'Prime yield','Logistikk'],
  ].map(([segment,figures,title,label])=>{
    const matches=(figures||[]).filter(f=>f.title?.trim().toLowerCase()===title.toLowerCase());
    if(matches.length!==1 || matches[0].unit!=='%' || typeof matches[0].number!=='number' || !(matches[0].number>0&&matches[0].number<20))throw new Error(`Invalid Akershus figure ${segment}`);
    return {source:'akershus',segment,value:matches[0].number,period,sourceName:'Akershus Eiendom',
      sourceUrl:URL,sourceDocument:`Segmentoversikt ${label}`,method:'akershus_embedded_segment_json'};
  });
}
export async function fetchAkershusYields() {
  const response=await fetch(URL,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'MarketDashboardPWA/1.0','Cache-Control':'no-cache'}});
  if(!response.ok)throw new Error(`Akershus HTTP ${response.status}`);
  return {results:parseAkershusYields(await response.text()),errors:[]};
}
