const BASE = String(process.env.HHKUNGFU_BASE_URL || 'https://hhkungfu.ee').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36';

function decodeHtml(s='') {
  return String(s)
    .replace(/&#(\d+);/g, (_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
function stripHtml(s='') { return decodeHtml(String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim(); }
async function fetchText(url, referer='') {
  const c = new AbortController(); const t = setTimeout(()=>c.abort(), 15000);
  try {
    const h = { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8' };
    if (referer) h.referer = referer;
    const r = await fetch(url, { headers:h, signal:c.signal });
    if (!r.ok) throw new Error('HHKungfu HTTP '+r.status+' '+url);
    return await r.text();
  } finally { clearTimeout(t); }
}
async function fetchJson(url, referer='') { return JSON.parse(await fetchText(url, referer)); }
function slugFromId(id) { const m=String(id||'').match(/^hhu:([^:]+)(?::(tap-[^:]+))?$/); return m ? {slug:m[1], chapter:m[2]||null} : null; }
function idFor(slug) { return 'hhu:'+slug; }
function metaTag(html, prop) {
  const re=/<meta\b[^>]*>/gi; let m;
  while ((m=re.exec(String(html||'')))) {
    const tag=m[0];
    const key=(tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)||[])[1];
    if (String(key||'').toLowerCase() !== String(prop||'').toLowerCase()) continue;
    const value=(tag.match(/content\s*=\s*["']([^"']*)["']/i)||[])[1]||'';
    return decodeHtml(value);
  }
  return '';
}
function wpToPreview(p) {
  const slug=String(p?.slug||''); if (!slug) return null;
  const fm=p?._embedded?.['wp:featuredmedia']?.[0]||{};
  const poster=fm?.media_details?.sizes?.medium_large?.source_url || fm?.media_details?.sizes?.medium?.source_url || fm?.source_url || '';
  const name=stripHtml(p?.title?.rendered||slug);
  const description=stripHtml(p?.excerpt?.rendered||'');
  return { id:idFor(slug), type:'series', name, poster, description, behaviorHints:{ defaultVideoId:idFor(slug) } };
}
function parseExtra(extraRaw='') {
  const out={}; let s=String(extraRaw||'').replace(/\.json$/i,'');
  if (!s) return out;
  for (const part of s.split('&')) { const i=part.indexOf('='); if (i<0) continue; const k=decodeURIComponent(part.slice(0,i)), v=decodeURIComponent(part.slice(i+1)); out[k]=v; }
  return out;
}
async function catalog(extra={}) {
  const skip=Math.max(0,Number(extra.skip||0)); const page=Math.floor(skip/20)+1;
  const qs=new URLSearchParams({ per_page:'20', page:String(page), _embed:'1', orderby:'date', order:'desc' });
  if (extra.search) qs.set('search', String(extra.search));
  let posts=[];
  try { posts=await fetchJson(BASE+'/wp-json/wp/v2/posts?'+qs.toString()); }
  catch (e) { if (page>1) return []; throw e; }
  return (Array.isArray(posts)?posts:[]).map(wpToPreview).filter(Boolean);
}
function parseEpisodes(html) {
  const re=/<a\b([^>]*\bdata-post-id=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  const byChapter=new Map(); let m;
  while ((m=re.exec(html))) {
    const attrs=m[1], postId=m[2];
    const ep=(attrs.match(/data-ep=["']([^"']+)["']/i)||[])[1];
    const sv=(attrs.match(/data-sv=["']([^"']+)["']/i)||[])[1]||'1';
    const href=decodeHtml((attrs.match(/href=["']([^"']+)["']/i)||[])[1]||'');
    const title=decodeHtml((attrs.match(/title=["']([^"']+)["']/i)||[])[1]||stripHtml(m[3]));
    if (!ep || !postId) continue;
    if (!byChapter.has(ep)) byChapter.set(ep,{ ep,postId,title:title||ep,servers:[] });
    const x=byChapter.get(ep); if (!x.servers.some(a=>a.sv===sv)) x.servers.push({sv,href});
  }
  const arr=[...byChapter.values()];
  arr.sort((a,b)=>{ const na=Number((a.ep.match(/\d+(?:\.\d+)?/)||[])[0]||0), nb=Number((b.ep.match(/\d+(?:\.\d+)?/)||[])[0]||0); return na-nb; });
  return arr;
}
async function detail(slug) { const url=BASE+'/'+slug; const html=await fetchText(url); return {html,url,episodes:parseEpisodes(html)}; }
async function meta(id) {
  const parsed=slugFromId(id); if (!parsed) return null;
  const {html,url,episodes}=await detail(parsed.slug);
  const name=metaTag(html,'og:title').replace(/\s*[-–|]\s*HHKungfu.*$/i,'').trim() || parsed.slug.replace(/-/g,' ');
  const poster=metaTag(html,'og:image');
  const description=metaTag(html,'og:description') || metaTag(html,'description');
  const videos=episodes.map((e,i)=>({ id:idFor(parsed.slug)+':'+e.ep, title:e.title||('Tập '+(i+1)), season:1, episode:i+1 }));
  return { id:idFor(parsed.slug), type:'series', name, poster, background:poster, description, videos, behaviorHints:{ defaultVideoId:videos[0]?.id || idFor(parsed.slug), website:url } };
}
async function playerIframe(postId, chapter, sv, type, referer) {
  const q=new URLSearchParams({ action:'dox_ajax_player', post_id:String(postId), chapter_st:String(chapter), type:String(type), sv:String(sv) });
  const out=await fetchText(BASE+'/player/player.php?'+q.toString(), referer);
  return decodeHtml((out.match(/<iframe[^>]+src=["']([^"']+)/i)||[])[1]||'');
}
async function streams(id) {
  const parsed=slugFromId(id); if (!parsed?.chapter) return [];
  const {episodes}=await detail(parsed.slug); const ep=episodes.find(x=>x.ep===parsed.chapter); if (!ep) return [];
  const servers=ep.servers.length ? ep.servers : [{sv:'1',href:BASE+'/watch-'+parsed.slug+'/'+parsed.chapter+'-sv1.html'}];
  const out=[];
  for (const server of servers) {
    const label=server.sv==='2' ? 'Thuyết minh' : 'Vietsub';
    const watchUrl=server.href || BASE+'/watch-'+parsed.slug+'/'+parsed.chapter+'-sv'+server.sv+'.html';
    if (!watchUrl || out.some(x=>x.externalUrl===watchUrl)) continue;
    out.push({
      name:'🐉 HHKungfu • '+label,
      title:label+' • mở player HHKungfu',
      externalUrl:watchUrl,
      description:'HHKungfu • '+ep.title+' • '+label,
      behaviorHints:{ bingeGroup:'hhkungfu-watch-'+server.sv }
    });
  }
  return out;
}
module.exports={ BASE, parseExtra, catalog, meta, streams, idFor, slugFromId };
