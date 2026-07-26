# News Breach

Expo React Native frontend and Express.js backend in separate folders.

## Project Structure

- `frontend/` - Expo React Native app
- `backend/` - Express.js API

## Setup

Install dependencies from the project root:

```sh
npm install
```

## Run

Start both apps:

```sh
npm run dev
```

Start only the backend:

```sh
npm run dev:backend
```

Start only the frontend:

```sh
npm run dev:frontend
```

The backend runs on `http://localhost:3000` by default.

## Deploy Backend On Render

Create a Render **Web Service** for the backend.

Recommended settings for this workspace layout:

```txt
Runtime: Node
Root Directory: leave blank
Build Command: npm install
Start Command: npm --workspace backend run start
Health Check Path: /health
```

Render provides `PORT` automatically. The backend already binds to `0.0.0.0`, so it can receive Render traffic.

For a quick test deploy, no extra storage setup is required. For a production deploy that should keep upload history and the SQLite database after restarts/redeploys, add a persistent disk and set:

```txt
DATA_DIR=/var/data/news-breach/data
UPLOADS_DIR=/var/data/news-breach/uploads
OCR_CACHE_DIR=/var/data/news-breach/ocr-cache
```

Optional plagiarism search variables:

```txt
BRAVE_SEARCH_API_KEY=your_key_here
BRAVE_SEARCH_ENDPOINT=https://api.search.brave.com/res/v1/web/search
BRAVE_SEARCH_COUNTRY=NG
BRAVE_SEARCH_LANG=en
```

After Render deploys, confirm these URLs work:

```txt
https://your-render-service-name.onrender.com/
https://your-render-service-name.onrender.com/health
```

## Connect Frontend Release Builds

The Expo app reads `EXPO_PUBLIC_API_BASE_URL` from the build environment. Set it to the deployed Render URL without a trailing slash:

```txt
EXPO_PUBLIC_API_BASE_URL=https://your-render-service-name.onrender.com
```

For local frontend testing against Render, create `frontend/.env` from `frontend/.env.example`, then run:

```sh
npm run dev:frontend
```

For EAS release builds, add `EXPO_PUBLIC_API_BASE_URL` as a production environment variable in EAS before building. Because it is an `EXPO_PUBLIC_` value, it is bundled into the app at build time.
