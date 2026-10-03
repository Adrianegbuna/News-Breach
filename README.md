# News Breach

Express.js backend API for checking uploaded newspaper PDFs and DOCX files for
possible Nigerian Press Council ethics breaches and media-story headlines.

## Project Structure

- `backend/src/server.js` - Express API entrypoint
- `backend/src/breachDetector.js` - ethics breach analysis
- `backend/src/mediaStoryDetection.js` - media headline detection
- `backend/src/textExtractor.js` - PDF/DOCX text extraction and OCR support
- `Web/dist/` - static web app served by the backend in production

## Setup

Install dependencies:

```sh
npm install
```

## Run

Start the API locally:

```sh
npm run dev
```

The backend runs on `http://localhost:3000` by default.

When `Web/dist/` exists, the backend serves the web app at the root URL:

```txt
http://localhost:3000/
```

## API

- `GET /` - service status message
- `GET /health` - health check for hosting platforms
- `POST /uploads` - upload a `.pdf` or `.docx` file using form field `file`
- `GET /uploads` - currently returns an empty list

## Deploy On Render

This repo includes `render.yaml`, so Render can detect the web service
settings automatically.

Manual Render settings:

```txt
Runtime: Node
Root Directory: leave blank
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

Render provides `PORT` automatically. The server binds to `0.0.0.0`, so it can
receive hosted traffic.

## Deploy On Railway

This repo includes `railpack.json` with:

```txt
Start Command: npm start
Health Check Path: /health
```

Railway also provides `PORT` automatically.

## Environment Variables

For a quick test deploy, no extra storage setup is required. For production,
use persistent storage if your host supports it and set:

```txt
DATA_DIR=/var/data/news-breach/data
UPLOADS_DIR=/var/data/news-breach/uploads
OCR_CACHE_DIR=/var/data/news-breach/ocr-cache
```

Optional OCR tuning:

```txt
OCR_LANGUAGE=eng
MAX_PDF_OCR_PAGES=3
PDF_OCR_DESIRED_WIDTH=1200
MAX_PDF_OCR_FILE_SIZE=8388608
```

Optional OpenAI second-stage review:

```txt
OPENAI_API_KEY=your_key_here
LLM_REVIEW_MODEL=gpt-5
LLM_REVIEW_ENDPOINT=https://api.openai.com/v1/responses
LLM_REVIEW_MAX_BREACHES=18
```

Optional Brave plagiarism search:

```txt
BRAVE_SEARCH_API_KEY=your_key_here
BRAVE_SEARCH_ENDPOINT=https://api.search.brave.com/res/v1/web/search
BRAVE_SEARCH_COUNTRY=NG
BRAVE_SEARCH_LANG=en
```

After deployment, confirm these URLs work:

```txt
https://your-service-url/
https://your-service-url/health
```
