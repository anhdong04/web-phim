'use strict';

const http = require('node:http');
const { HHTQProvider, CATEGORY_PATHS } = require('./hhtq_provider');
const { resolveFallback } = require('./hhtq_hh4k_fallback');

const originalCreateServer = http.createServer;
const provider = new HHTQProvider();
const VERSION = '1.0.1';
const PAGE_SIZE = Math.max(10, Math.min(50, Number(process.env.HHTQ_PAGE_SIZE || 20)));

function safeDecode(value) { try { return decodeURIComponent(String(value || '')); } catch { return String(value || ''); } }
function enc(value) { return Buffer.from(String(value || ''), 'utf8').toString('base64url'); }
function dec(value) { try { return Buffer.from(String(value || ''), 'base64url').toString('utf8'); } catch { return ''; } }
function rootId(detailUrl) { return `hhtq:${enc(detailUrl)}`; }
function parseId(raw) {
  const id = safeDecode(raw);
  let m = id.match(/^hhtq:([A-Za-z0-9_-]+)$/);
  if (m) return { id, detailKey:m[1], detailUrl:dec(m[1]), episodeIndex:null };
  m = id.match(/^hhtq:([A-Za-z0-9_-]+):e:(\d+)$/);
  if (m) return { id, detailKey:m[1], detailUrl:dec(m[1]), episodeIndex:Number(m[2]) };
  return null;
}
function parseExtra(raw = '') {
  const out = { search:'', skip:0 };
  if (!raw) return out;
  const p = new URLSearchParams(safeDecode(raw));
  out.search = String(p.get('search') || '').trim();
  out.skip = Math.max(0, Number(p.get('skip') || 0) || 0);
  return out;
}
function sendJson(req,res,status,body,maxAge=0) {
  const data=JSON.stringify(body);
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'content-length':Buffer.byteLength(data),
    'access-control-allow-origin':'*',
    'access-control-allow-headers':'*',
    'access-control-allow-methods':'GET,HEAD,OPTIONS',
    'cache-control':maxAge?`public, max-age=${maxAge}`:'no-store',
    'x-web-phim-hhtq':'bridge-v1.0.1'
  });
  if(req.method==='HEAD') return res.end();
  res.end(data);
}

const CATALOGS = Object.freeze([
  { type:'series', id:'hhtq-new', name:'🐲 HHTQ • Mới cập nhật' },
  { type:'series', id:'hhtq-costume', name:'🏯 HHTQ • Cổ Trang' },
  { type:'series', id:'hhtq-modern', name:'🏙️ HHTQ • Hiện Đại' },
  { type:'series', id:'hhtq-fantasy', name:'✨ HHTQ • Huyền Huyễn' },
  { type:'series', id:'hhtq-scifi', name:'🚀 HHTQ • Viễn Tưởng' },
  { type:'movie', id:'hhtq-movies', name:'🎞️ HHTQ • Chiếu Rạp' }
]);
const EXTRA = [{name:'search',isRequired:false},{name:'skip',isRequired:false}];

function manifest() {
  return {
    id:'vn.webphim.hhtq', version:VERSION, name:'🐲 HHTQ',
    description:'HHTQProvider port cho Nuvio/Stremio: catalog, metadata, tập phim và resolver đa server',
    resources:[
      'catalog',
      {name:'meta',types:['movie','series'],idPrefixes:['hhtq:']},
      {name:'stream',types:['movie','series'],idPrefixes:['hhtq:']}
    ],
    types:['movie','series'], idPrefixes:['hhtq:'],
    catalogs:CATALOGS.map(x=>({...x,extra:EXTRA})),
    behaviorHints:{configurable:false,configurationRequired:false,adult:false,p2p:false}
  };
}
function preview(item,typeOverride=null) {
  const type = typeOverride || item.type || 'series';
  const meta={ id:rootId(item.detailUrl), type, name:item.title, description:['HHTQ',item.episodeLabel].filter(Boolean).join(' • ') || 'Hoạt hình Trung Quốc' };
  if(item.posterUrl){meta.poster=item.posterUrl;meta.background=item.posterUrl;}
  return meta;
}
async function catalog(type,id,extra={}) {
  const spec=CATALOGS.find(x=>x.type===type&&x.id===id);
  if(!spec) return [];
  const skip=Math.max(0,Number(extra.skip||0));
  if(extra.search){
    const items=await provider.search(extra.search);
    return items.filter(x=>type==='movie'?x.type==='movie':true).slice(skip,skip+PAGE_SIZE).map(x=>preview(x,type));
  }
  const pageNo=Math.floor(skip/PAGE_SIZE)+1;
  const items=await provider.catalog(id,pageNo);
  const offset=skip%PAGE_SIZE;
  return items.slice(offset,offset+PAGE_SIZE).map(x=>preview(x,type));
}
async function metaFor(type,id) {
  const parsed=parseId(id); if(!parsed||!/^https?:\/\//i.test(parsed.detailUrl)) return null;
  const d=await provider.detail(parsed.detailUrl);
  const eps=(d.episodes||[]);
  const videos=eps.map((ep,index)=>({
    id:`hhtq:${parsed.detailKey}:e:${index}`,
    title:ep.name || `Tập ${index+1}`,
    season:1,
    episode:Number.isFinite(ep.number)?ep.number:index+1
  }));
  const effectiveType=type==='movie'?'movie':'series';
  const meta={
    id:`hhtq:${parsed.detailKey}`, type:effectiveType, name:d.title,
    poster:d.posterUrl||undefined, background:d.background||d.posterUrl||undefined,
    description:d.description||'Hoạt hình Trung Quốc', releaseInfo:d.year?String(d.year):undefined,
    genres:d.genres||['Hoạt hình Trung Quốc']
  };
  if(effectiveType==='series') meta.videos=videos;
  if(videos.length) meta.behaviorHints={defaultVideoId:videos[0].id};
  return meta;
}
function streamObject(link,title) {
  const s={
    name:'🐲 HHTQ',
    title:[link.serverName,title].filter(Boolean).join(' • '),
    behaviorHints:{notWebReady:!link.isM3u8,bingeGroup:'webphim-hhtq-v1'}
  };
  if(link.url){
    s.url=link.url;
    if(link.headers&&Object.keys(link.headers).length) s.behaviorHints.proxyHeaders={request:link.headers};
  }
  return s;
}
async function streamsFor(type,id) {
  const parsed=parseId(id); if(!parsed||!/^https?:\/\//i.test(parsed.detailUrl)) return [];
  const d=await provider.detail(parsed.detailUrl);
  const eps=d.episodes||[];
  let index=parsed.episodeIndex;
  if(index==null && type==='movie') index=0;
  if(index==null) return [];

  // HHTQ movie pages marked FULL do not always expose an episode list. In that
  // case the CloudStream provider resolves the player from the movie page itself.
  // Preserve that behavior instead of returning [] before the host resolver runs.
  let ep=eps[index]||null;
  if(!ep?.watchUrl && type==='movie') {
    ep={ name:'FULL', number:1, watchUrl:parsed.detailUrl, serverName:'HHTQ' };
  }
  if(!ep?.watchUrl) return [];

  const links=await provider.streams(ep.watchUrl).catch(()=>[]);
  const direct=(links||[]).filter(x=>x?.url&&/^https?:\/\//i.test(x.url));
  if(direct.length) return direct.slice(0,10).map(x=>streamObject(x,d.title));
  const fallback=await resolveFallback(d.title,ep);
  return (fallback||[]).filter(x=>x?.url).slice(0,10).map(x=>streamObject(x,d.title));
}
async function diag() {
  const started=Date.now();
  const items=await provider.catalog('hhtq-new',1);
  let detail=null;
  if(items[0]) detail=await provider.detail(items[0].detailUrl);
  return {ok:items.length>0,version:VERSION,baseUrl:provider.mainUrl,elapsedMs:Date.now()-started,itemCount:items.length,firstTitle:items[0]?.title||null,firstEpisodes:detail?.episodes?.length||0};
}

async function handleHhtq(req,res,pathname) {
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,HEAD,OPTIONS'});return res.end();}
  if(req.method!=='GET'&&req.method!=='HEAD') return sendJson(req,res,405,{error:'Method not allowed'});
  if(pathname==='/hhtq'||pathname==='/hhtq/') return sendJson(req,res,200,{addon:'HHTQ',manifest:'/hhtq/manifest.json',version:VERSION});
  if(pathname==='/hhtq/manifest.json') return sendJson(req,res,200,manifest(),30);
  if(pathname==='/hhtq/diag'){try{return sendJson(req,res,200,await diag());}catch(e){return sendJson(req,res,200,{ok:false,version:VERSION,error:String(e?.message||e).slice(0,400)});}}
  let m=pathname.match(/^\/hhtq\/catalog\/(movie|series)\/([^/]+)(?:\/([^/]+))?\.json$/i);
  if(m){try{return sendJson(req,res,200,{metas:await catalog(m[1],m[2],parseExtra(m[3]||''))},30);}catch(e){console.error('[hhtq] catalog:',e.message);return sendJson(req,res,200,{metas:[]});}}
  m=pathname.match(/^\/hhtq\/meta\/(movie|series)\/(.+)\.json$/i);
  if(m){try{return sendJson(req,res,200,{meta:await metaFor(m[1],m[2])},120);}catch(e){console.error('[hhtq] meta:',e.message);return sendJson(req,res,200,{meta:null});}}
  m=pathname.match(/^\/hhtq\/stream\/(movie|series)\/(.+)\.json$/i);
  if(m){try{return sendJson(req,res,200,{streams:await streamsFor(m[1],m[2])});}catch(e){console.error('[hhtq] stream:',e.message);return sendJson(req,res,200,{streams:[]});}}
  return sendJson(req,res,404,{error:'HHTQ route not found'});
}

globalThis.__webphimHhtq={manifest,catalog,metaFor,streamsFor,rootId,parseId,CATALOGS};

http.createServer=function patchedCreateServer(...args){
  if(typeof args[0]!=='function') return originalCreateServer.apply(http,args);
  const downstream=args[0];
  args[0]=function wrapped(req,res){
    let pathname='/';
    try{pathname=new URL(req.url,`http://${req.headers.host||'localhost'}`).pathname;}catch{}
    if(pathname==='/hhtq'||pathname.startsWith('/hhtq/')){
      Promise.resolve(handleHhtq(req,res,pathname)).catch(err=>{console.error('[hhtq] unhandled:',err);if(!res.headersSent)sendJson(req,res,500,{error:'HHTQ internal error'});else res.end();});
      return;
    }
    return downstream(req,res);
  };
  return originalCreateServer.apply(http,args);
};

console.log('[hhtq] bridge v1.0.1 enabled at /hhtq/*');
module.exports={manifest,catalog,metaFor,streamsFor,parseId,rootId,handleHhtq,CATALOGS,CATEGORY_PATHS};
