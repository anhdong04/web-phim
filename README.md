# KKPhim Streams for Nuvio

A small **Stremio-compatible stream addon** that exposes streams from the public KKPhim API (`phimapi.com`) to Nuvio and other compatible clients.

## How it works

```text
Nuvio / Stremio-compatible client
        |
        | movie/series external ID
        v
KKPhim Streams addon
        |
        | IMDb or TMDB lookup
        v
https://phimapi.com
        |
        | episodes[].server_data[].link_m3u8
        v
Nuvio player
```

The addon is intentionally **stream-only**. It does not create a duplicate movie catalog. When Nuvio requests a movie or episode using a supported IMDb/TMDB ID, the addon asks KKPhim for matching playback sources.

## Supported IDs

- Movie IMDb: `tt1234567`
- Series IMDb: `tt1234567:1:2`
- Movie TMDB: `tmdb:12345`
- Series TMDB: `tmdb:12345:1:2`

## Requirements

- Node.js 18+
- No third-party Node dependencies

## Run locally

```bash
npm start
```

Default manifest:

```text
http://127.0.0.1:7000/manifest.json
```

You can change the port:

```bash
PORT=8080 npm start
```

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `7000` | HTTP port |
| `KKPHIM_API` | `https://phimapi.com` | KKPhim API base URL |
| `REQUEST_TIMEOUT_MS` | `10000` | Upstream timeout |

## Test

Manifest:

```bash
curl http://localhost:7000/manifest.json
```

Example movie stream request:

```bash
curl http://localhost:7000/stream/movie/tt1254207.json
```

Example series episode request:

```bash
curl http://localhost:7000/stream/series/tt0944947:1:1.json
```

Whether a given title returns streams depends on whether KKPhim has a matching external ID and playback source.

## Deploy to Render

1. Push this repository to GitHub.
2. Create a new **Web Service** in Render and select the repository.
3. Runtime: Node.
4. Build command: leave empty (or `npm install`).
5. Start command: `npm start`.
6. After deployment, install this URL in Nuvio:

```text
https://YOUR-SERVICE.onrender.com/manifest.json
```

A `render.yaml` file is included for Blueprint deployment as well.

## Deploy with Docker

```bash
docker build -t kkphim-nuvio-addon .
docker run --rm -p 7000:7000 kkphim-nuvio-addon
```

Then open:

```text
http://localhost:7000/manifest.json
```

## Notes about TV / phone clients

`localhost` on a phone or TV points to that phone/TV, not your computer. For normal Nuvio use, deploy the addon to a public HTTPS URL (Render, Railway, Fly.io, VPS, etc.).

## Legal / access note

This project is only an adapter. Use it only with content and sources you are authorized to access, and comply with the terms of the upstream service and applicable law.
