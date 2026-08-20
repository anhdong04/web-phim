'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webphim-multiuser-test-'));
process.env.NODE_ENV = 'development';
process.env.WEBPHIM_CONFIG_STORE = path.join(dir, 'store.json');
process.env.CONFIG_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

const mod = require('../multiuser_secure');
const http = require('node:http');

const secret = 'tb_test_secret_1234567890';
assert.equal(mod.decryptSecret(mod.encryptSecret(secret)), secret);
assert.ok(!JSON.stringify(mod.manifestFor({
  publicId:'cfg_test',
  name:'Web Phim',
  enabledSources:['kkphim'],
  subtitles:{enabled:true,languages:['vi'],aiFallback:false}
})).includes(secret));

function legacy(req, res) {
  if (req.url === '/full/stream/movie/tt123.json') {
    const body = JSON.stringify({ streams: [
      { name:'KKPhim', title:'KKPhim • 1080p', url:'https://example.test/kk.m3u8' },
      { name:'YanHH3D', title:'YanHH3D', url:'https://example.test/yan.m3u8' },
      { name:'Other', title:'Unknown upstream', url:'https://example.test/other.m3u8' }
    ]});
    res.writeHead(200, {'content-type':'application/json','content-length':Buffer.byteLength(body)});
    return res.end(body);
  }
  const body = JSON.stringify({ok:true,path:req.url});
  res.writeHead(200, {'content-type':'application/json','content-length':Buffer.byteLength(body)});
  res.end(body);
}

const server = http.createServer(legacy);

async function request(base, url, options = {}, cookie = '') {
  const headers = {...(options.headers || {})};
  if (cookie) headers.cookie = cookie;
  if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
  const r = await fetch(base + url, {...options, headers});
  const text = await r.text();
  const body = text ? JSON.parse(text) : {};
  return {status:r.status, body, cookie:r.headers.get('set-cookie') || cookie};
}
function cookieOnly(setCookie) { return String(setCookie || '').split(';')[0]; }

server.listen(0, '127.0.0.1', async () => {
  try {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    let a = await request(base, '/api/auth/register', {
      method:'POST',
      body:JSON.stringify({email:'a@example.com',password:'password-A-12345'})
    });
    assert.equal(a.status, 201);
    const cookieA = cookieOnly(a.cookie);

    const createA = await request(base, '/api/configs', {
      method:'POST',
      body:JSON.stringify({
        name:'A',
        enabledSources:['kkphim'],
        torboxApiKey:secret,
        subtitles:{enabled:true,languages:['vi'],aiFallback:false}
      })
    }, cookieA);
    assert.equal(createA.status, 201);
    const cfgA = createA.body.config;
    assert.ok(/^cfg_/.test(cfgA.publicId));
    assert.equal(JSON.stringify(createA.body).includes(secret), false);

    const manifest = await request(base, `/a/${cfgA.publicId}/manifest.json`);
    assert.equal(manifest.status, 200);
    assert.equal(JSON.stringify(manifest.body).includes(secret), false);
    assert.equal(manifest.body.id.includes('a@example.com'), false);

    const streams = await request(base, `/a/${cfgA.publicId}/stream/movie/tt123.json`);
    assert.equal(streams.status, 200);
    assert.deepEqual(streams.body.streams.map(x => x.name), ['KKPhim']);

    let b = await request(base, '/api/auth/register', {
      method:'POST',
      body:JSON.stringify({email:'b@example.com',password:'password-B-12345'})
    });
    assert.equal(b.status, 201);
    const cookieB = cookieOnly(b.cookie);
    const cross = await request(base, `/api/configs/${cfgA.id}`, {method:'GET'}, cookieB);
    assert.equal(cross.status, 404);

    const revoke = await request(base, `/api/configs/${cfgA.id}/revoke`, {method:'POST', body:'{}'}, cookieA);
    assert.equal(revoke.status, 200);
    const revokedManifest = await request(base, `/a/${cfgA.publicId}/manifest.json`);
    assert.equal(revokedManifest.status, 410);

    const raw = fs.readFileSync(process.env.WEBPHIM_CONFIG_STORE, 'utf8');
    assert.equal(raw.includes(secret), false);
    console.log('multiuser secure tests: PASS');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      try { fs.rmSync(dir, {recursive:true,force:true}); } catch {}
    });
  }
});
