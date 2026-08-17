# KKPhim + Streams for Nuvio

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/anhdong04/web-phim)

A small Stremio-compatible stream aggregator for Nuvio. It keeps KKPhim as the built-in source and can also merge streams from other configured Stremio-compatible addons. The same service also exposes the standalone `/hhkungfu/*` and `/hh4k/*` addon routes.

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

The main addon is stream-only and does not create a duplicate movie catalog. Standalone provider routes such as HH4K can expose their own catalog and metadata.

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

The repository includes a Docker-based `render.yaml`. Docker is used because the HH4K resolver needs Chromium in addition to Node.js.

Use the **Deploy to Render** button above, review the Blueprint, and approve it in your Render account. The Blueprint creates the `kkphim-nuvio-addon` web service from `main` and enables auto-deploys for later commits.

After Render deploys the repository, add any optional upstream manifest URLs in Render under:

`Web Service -> Environment`

Empty optional variables are ignored. After saving environment variables, redeploy/restart the Render service.

Main manifest:

```text
https://YOUR-SERVICE.onrender.com/manifest.json
```

HH4K manifest:

```text
https://YOUR-SERVICE.onrender.com/hh4k/manifest.json
```

HHKungfu manifest:

```text
https://YOUR-SERVICE.onrender.com/hhkungfu/manifest.json
```

## Local run

Node.js 18+ is required.

```bash
npm install
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
- HH4K tries validated direct HLS first and falls back to the external player only when no validated direct HLS is available.

## Legal / access note

Use this adapter only with content and sources you are authorized to access, and comply with the terms of upstream services and applicable law.
