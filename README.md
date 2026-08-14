# KKPhim + Streams for Nuvio

A small Stremio-compatible stream aggregator for Nuvio. It keeps KKPhim as the built-in source and can also merge streams from other configured Stremio-compatible addons.

## How it works

```text
Nuvio
  -> this addon
     -> KKPhim
     -> AIOStreams (optional)
     -> TorBox addon (optional)
     -> Comet (optional)
     -> MediaFusion (optional)
     -> Torrentio (optional)
     -> any other compatible stream addon
  -> deduplicate
  -> return one stream list to Nuvio
```

The addon is stream-only and does not create a duplicate movie catalog.

## Supported IDs

- Movie IMDb: `tt1234567`
- Series IMDb: `tt1234567:1:2`
- Movie TMDB: `tmdb:12345`
- Series TMDB: `tmdb:12345:1:2`

## Environment variables

| Variable | Meaning |
|---|---|
| `PORT` | HTTP port, default `7000` |
| `KKPHIM_API` | KKPhim API base URL |
| `REQUEST_TIMEOUT_MS` | Per-upstream timeout |
| `MANIFEST_CACHE_MS` | Cache time for upstream manifests |
| `AIOSTREAMS_MANIFEST_URL` | Full configured AIOStreams manifest URL |
| `TORBOX_MANIFEST_URL` | Full configured TorBox-compatible addon manifest URL |
| `COMET_MANIFEST_URL` | Full configured Comet manifest URL |
| `MEDIAFUSION_MANIFEST_URL` | Full configured MediaFusion manifest URL |
| `TORRENTIO_MANIFEST_URL` | Full configured Torrentio manifest URL |
| `UPSTREAM_ADDON_URLS` | Other manifests, comma/newline separated; optional `Name|URL` syntax |

Important: for addons that have a configuration page, paste the final configured `manifest.json` URL, not just the addon home page. If an upstream service uses a debrid account, configure that service on the upstream addon itself and then paste its generated manifest URL here. Do not put API keys directly in this repository.

## Render setup

The repository already includes `render.yaml`. After Render deploys the repository, add the desired manifest URLs in Render under:

`Web Service -> Environment`

For example, set only the providers you want to use. Empty variables are ignored.

After saving environment variables, redeploy/restart the Render service. Nuvio continues to use the same manifest URL:

```text
https://YOUR-SERVICE.onrender.com/manifest.json
```

## Local run

Node.js 18+ is required. There are no third-party Node dependencies.

```bash
npm start
```

Manifest:

```text
http://127.0.0.1:7000/manifest.json
```

Example request:

```bash
curl http://127.0.0.1:7000/stream/movie/tt0133093.json
```

## Behavior

- Providers are queried in parallel.
- A failed or slow provider does not stop the others.
- Manifest metadata is cached.
- Duplicate direct URLs, external URLs, and torrent hashes/file indexes are removed.
- Upstream stream objects are preserved, so compatible fields such as direct `url`, `externalUrl`, or `infoHash` can pass through.

## Legal / access note

Use this adapter only with content and sources you are authorized to access, and comply with the terms of upstream services and applicable law.
