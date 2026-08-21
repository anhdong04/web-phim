'use strict';

const http=require('node:http');
const {HHTQProvider}=require('./hhtq_provider');
const {playerAaaaUrls}=require('./hhtq_exact_patch');
const {knownHostUrls}=require('./hhtq_watch_known_hosts_patch');
const originalCreateServer=http.createServer;
const provider=new HHTQProvider();

function hp(v){try{const u=new URL(String(v||''));return {host:u.host,path:u.pathname};}catch{return {host:null,path:null};}}
function timeout(p,ms){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);}
async function inspectItem(item){
  const out={title:item?.title||null,detail:hp(item?.detailUrl),type:item?.type||null};
  try{
    const d=await timeout(provider.detail(item.detailUrl),12000);
    const ep=(d?.episodes||[])[0]||null;
    out.episodeCount=(d?.episodes||[]).length;
    out.watch=hp(ep?.watchUrl);
    if(!ep?.watchUrl){out.result='no-watch-url';return out;}
    try{
      const html=await timeout(provider.fetchText(ep.watchUrl,provider.mainUrl),10000);
      out.playerAaaa=playerAaaaUrls(html,ep.watchUrl).map(hp);
      out.knownHosts=knownHostUrls(html).map(hp);
    }catch(e){out.watchHtmlError=String(e?.message||e).slice(0,120);}
    try{
      const rows=await timeout(provider.streams(ep.watchUrl),18000);
      out.streams=(rows||[]).slice(0,4).map(x=>({serverName:x?.serverName||null,url:hp(x?.url),isM3u8:!!x?.isM3u8}));
      out.result=out.streams.length?'resolved':'zero-streams';
    }catch(e){out.streamError=String(e?.message||e).slice(0,140);out.result='stream-error';}
  }catch(e){out.detailError=String(e?.message||e).slice(0,140);out.result='detail-error';}
  return out;
}
async function diagnose(limit=4){
  const n=Math.max(1,Math.min(8,Number(limit)||4));
  const started=Date.now();
  const items=(await provider.catalog('hhtq-new',1)).slice(0,n);
  const results=[];
  for(let i=0;i<items.length;i+=2){
    const batch=items.slice(i,i+2);
    results.push(...await Promise.all(batch.map(inspectItem)));
  }
  const hostCounts={};
  for(const r of results){for(const p of r.playerAaaa||[]){if(p.host)hostCounts[p.host]=(hostCounts[p.host]||0)+1;}for(const p of r.knownHosts||[]){if(p.host)hostCounts[p.host]=(hostCounts[p.host]||0)+1;}}
  return {ok:true,diagnostic:'hhtq-batch-v1',limit:n,elapsedMs:Date.now()-started,resolved:results.filter(x=>x.result==='resolved').length,failed:results.filter(x=>x.result!=='resolved').length,hostCounts,results};
}
function send(req,res,body){const data=JSON.stringify(body,null,2);res.writeHead(200,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data),'access-control-allow-origin':'*','cache-control':'no-store'});if(req.method==='HEAD')return res.end();res.end(data);}
http.createServer=function patchedCreateServer(...args){
  if(typeof args[0]!=='function')return originalCreateServer.apply(http,args);
  const downstream=args[0];
  args[0]=function wrapped(req,res){
    let u;try{u=new URL(req.url,`http://${req.headers.host||'localhost'}`);}catch{u=new URL('http://localhost/');}
    if(u.pathname==='/hhtq/diag/batch'){
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'content-type':'text/plain'});return res.end('Method not allowed');}
      Promise.resolve(diagnose(u.searchParams.get('limit')||4)).then(x=>send(req,res,x)).catch(e=>send(req,res,{ok:false,diagnostic:'hhtq-batch-v1',error:String(e?.message||e).slice(0,300)}));
      return;
    }
    return downstream(req,res);
  };
  return originalCreateServer.apply(http,args);
};
console.log('[hhtq] batch diagnostic enabled at /hhtq/diag/batch');
module.exports={diagnose,inspectItem};
