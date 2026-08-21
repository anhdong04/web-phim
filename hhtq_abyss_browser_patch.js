'use strict';

const fs = require('node:fs');
const puppeteer = require('puppeteer-core');
const { HHTQProvider } = require('./hhtq_provider');
const { playerAaaaUrls } = require('./hhtq_exact_patch');

const previousStreams = HHTQProvider.prototype.streams;
let browserPromise = null;
const cache = new Map();
const inflight = new Map();

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function browserPath(){
  const candidates=[process.env.HHTQ_CHROMIUM_PATH,process.env.HH4K_CHROMIUM_PATH,process.env.HHKUNGFU_CHROMIUM_PATH,'/usr/bin/chromium-browser','/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'].map(x=>String(x||'').trim()).filter(Boolean);
  return candidates.find(p=>fs.existsSync(p))||'';
}
async function getBrowser(){
  if(browserPromise){ try{const b=await browserPromise;if(b.connected)return b;}catch{} browserPromise=null; }
  browserPromise=(async()=>{
    const executablePath=browserPath();
    if(!executablePath) throw new Error('HHTQ Chromium executable not found');
    const b=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled','--autoplay-policy=no-user-gesture-required']});
    b.on('disconnected',()=>{browserPromise=null;});
    return b;
  })().catch(e=>{browserPromise=null;throw e;});
  return browserPromise;
}
function isAbyss(url=''){ try{return /(?:^|\.)abyssplayer\.com$/i.test(new URL(String(url)).hostname);}catch{return false;} }
function requestHeadersForClient(headers={}, embedUrl=''){
  const out={};
  for(const [k,v] of Object.entries(headers||{})){
    const n=String(k).toLowerCase();
    if(['accept','origin','referer','user-agent'].includes(n)&&v!=null) out[k]=String(v);
  }
  if(embedUrl&&!Object.keys(out).some(k=>k.toLowerCase()==='referer')) out.Referer=embedUrl;
  return out;
}
async function probeAbyss(watchUrl,embedUrl,timeoutMs=12000){
  const browser=await getBrowser();
  const page=await browser.newPage();
  let done=false, resolveHit;
  const hit=new Promise(r=>{resolveHit=r;});
  const finish=v=>{if(done)return;done=true;resolveHit(v);};
  try{
    await page.setViewport({width:1280,height:720});
    await page.evaluateOnNewDocument(()=>{try{Object.defineProperty(navigator,'webdriver',{get:()=>undefined});}catch{} try{if(!window.chrome)window.chrome={runtime:{}};}catch{}});
    if(watchUrl) await page.setExtraHTTPHeaders({Referer:String(watchUrl)}).catch(()=>{});
    page.on('response', async response=>{
      const u=response.url();
      if(!/\.(?:m3u8|mp4)(?:$|[?#])/i.test(u)) return;
      const status=response.status();
      if(status<200||status>=400) return;
      const reqHeaders=response.request()?.headers?.()||{};
      finish({url:u,isM3u8:/\.m3u8(?:$|[?#])/i.test(u),headers:requestHeadersForClient(reqHeaders,embedUrl),serverName:'HHTQ • Abyssplayer'});
    });
    await page.goto(embedUrl,{waitUntil:'domcontentloaded',timeout:Math.max(8000,timeoutMs)}).catch(()=>{});
    await page.evaluate(()=>{try{const v=document.querySelector('video');if(v){v.muted=true;const p=v.play();if(p&&p.catch)p.catch(()=>{});}}catch{}}).catch(()=>{});
    return await Promise.race([hit,sleep(Math.max(4500,Math.min(14000,timeoutMs))).then(()=>null)]);
  } finally { finish(null); try{await page.close();}catch{} }
}
async function resolveAbyssFromWatch(provider,watchUrl){
  let html='';
  try{html=await provider.fetchText(watchUrl,provider.mainUrl);}catch{return null;}
  const embeds=playerAaaaUrls(html,watchUrl).filter(isAbyss).slice(0,3);
  for(const embed of embeds){
    try{const row=await probeAbyss(watchUrl,embed,provider.timeoutMs||12000);if(row?.url)return row;}catch(e){console.warn('[hhtq] Abyss browser probe failed:',String(e?.message||e).slice(0,180));}
  }
  return null;
}
function ttl(){return Math.max(5000,Math.min(60000,Number(process.env.HHTQ_ABYSS_TTL_MS||20000)));}
async function cachedAbyss(provider,watchUrl){
  const key=String(watchUrl||'');
  const c=cache.get(key); if(c&&c.exp>Date.now()) return c.value;
  if(inflight.has(key)) return inflight.get(key);
  const work=resolveAbyssFromWatch(provider,key).then(v=>{cache.set(key,{value:v,exp:Date.now()+ttl()});return v;}).finally(()=>inflight.delete(key));
  inflight.set(key,work);return work;
}

HHTQProvider.prototype.streams=async function abyssBrowserStreams(watchUrl){
  const prior=await previousStreams.call(this,watchUrl).catch(()=>[]);
  if((prior||[]).some(x=>x?.url)) return prior;
  if(!browserPath()) return prior||[];
  const row=await cachedAbyss(this,watchUrl).catch(()=>null);
  return row?.url?[row]:(prior||[]);
};

console.log('[hhtq] Abyssplayer browser fallback enabled');
module.exports={browserPath,isAbyss,probeAbyss,resolveAbyssFromWatch};
