const fs = require('node:fs');
const BASE = String(process.env.HHKUNGFU_BASE_URL || 'https://hhkungfu.ee').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36';
const HLS_TTL_MS = Math.max(60_000, Number(process.env.HHKUNGFU_HLS_TTL_MS || 15 * 60_000));
const HLS_TIMEOUT_MS = Math.max(8_000, Number(process.env.HHKUNGFU_HLS_TIMEOUT_MS || 25_000));
const hlsCache = new Map();
let browserPromise = null;

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

function chromiumPath() {
  const configured=String(process.env.HHKUNGFU_CHROMIUM_PATH||'').trim();
  const candidates=[configured,'/usr/bin/chromium-browser','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  return candidates.find(p=>fs.existsSync(p)) || '';
}
async function getBrowser() {
  if (browserPromise) return browserPromise;
  browserPromise=(async()=>{
    const puppeteer=require('puppeteer-core');
    const executablePath=chromiumPath();
    if (!executablePath) throw new Error('HHKungfu Chromium executable not found');
    return puppeteer.launch({
      executablePath,
      headless:true,
      args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--mute-audio','--autoplay-policy=no-user-gesture-required']
    });
  })().catch(e=>{browserPromise=null;throw e;});
  return browserPromise;
}
async function resolveHls(watchUrl, cacheKey) {
  const cached=hlsCache.get(cacheKey);
  if (cached && cached.expiresAt>Date.now()) return cached.url;
  const browser=await getBrowser();
  const page=await browser.newPage();
  try {
    await page.setUserAgent(UA);
    await page.setViewport({width:1280,height:720});
    await page.evaluateOnNewDocument(()=>{
      try{Object.defineProperty(navigator,'webdriver',{get:()=>undefined,configurable:true});}catch{}
      try{Object.defineProperty(window,'outerWidth',{get:()=>window.innerWidth,configurable:true});}catch{}
      try{Object.defineProperty(window,'outerHeight',{get:()=>window.innerHeight,configurable:true});}catch{}
      try{
        const noop=function(){};
        for(const k of ['log','table','clear','debug','dir','dirxml','profile','profileEnd']){
          try{Object.defineProperty(console,k,{value:noop,writable:false,configurable:false});}catch{}
        }
      }catch{}
    });
    let settled=false;
    const hlsPromise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{ if(!settled){settled=true;reject(new Error('HHKungfu HLS timeout'));}},HLS_TIMEOUT_MS);
      page.on('request',req=>{
        const u=req.url();
        if(!settled && /\/master\.m3u8(?:\?|$)/i.test(u)){
          settled=true; clearTimeout(timer); resolve(u);
        }
      });
    });
    await page.goto(watchUrl,{waitUntil:'domcontentloaded',timeout:HLS_TIMEOUT_MS});
    const hls=String(await hlsPromise);
    if(!/^https:\/\/[^/]*helvid\.net\//i.test(hls)) throw new Error('Unexpected HHKungfu HLS host');
    hlsCache.set(cacheKey,{url:hls,expiresAt:Date.now()+HLS_TTL_MS});
    return hls;
  } finally {
    try{await page.close();}catch{}
  }
}

async function streams(id) {
  const parsed=slugFromId(id); if (!parsed?.chapter) return [];
  const {episodes}=await detail(parsed.slug); const ep=episodes.find(x=>x.ep===parsed.chapter); if (!ep) return [];
  const servers=ep.servers.length ? ep.servers : [{sv:'1',href:BASE+'/watch-'+parsed.slug+'/'+parsed.chapter+'-sv1.html'}];
  const preferred=servers.find(x=>x.sv==='1') || servers[0];
  if(!preferred) return [];
  const label=preferred.sv==='2' ? 'Thuyết minh' : 'Vietsub';
  const watchUrl=preferred.href || BASE+'/watch-'+parsed.slug+'/'+parsed.chapter+'-sv'+preferred.sv+'.html';
  try {
    const hls=await resolveHls(watchUrl, parsed.slug+'|'+parsed.chapter+'|'+preferred.sv);
    return [{
      name:'🐉 HHKungfu • '+label,
      title:'1080P HLS • '+label,
      url:hls,
      description:'HHKungfu • '+ep.title+' • native HLS',
      behaviorHints:{
        bingeGroup:'hhkungfu-native-'+preferred.sv,
        notWebReady:false,
        proxyHeaders:{ request:{ Referer:'https://streamfree.vip/' } }
      }
    }];
  } catch(e) {
    console.error('HHKungfu native HLS resolve failed:', label, e.message);
    return [];
  }
}
module.exports={ BASE, parseExtra, catalog, meta, streams, idFor, slugFromId, resolveHls };
