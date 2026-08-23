# Doclarity

Doclarity is an AI-powered legal document intelligence platform. Users can upload complex legal documents, receive structured analysis and clause breakdowns on an interactive dashboard, run document risk assessments, compare contracts side-by-side, and ask grounded follow-up questions through a context-aware RAG chatbot.

---

## 🌐 Project Information Hub (`index.html`)

For a interactive, self-contained visual breakdown of Doclarity's product architecture, AI pipeline steps, environment matrix, API endpoints, and local/production setup guides, open **`index.html`** in any web browser or host it via static web server:

```bash
# Open directly in default web browser (macOS / Linux / Windows)
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows (PowerShell/CMD)
```

The hub operates with zero external dependencies and air-gapped fallback styling, rendering detailed JSON schemas, architecture flows, and copyable setup commands.

---

## Current Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Parsing Engine**: `pdfjs-dist`, `mammoth` (DOCX), Tesseract OCR fallback
- **NLP & Named Entity Extraction**: Python `spacy_ner.py` (`en_core_web_sm`)
- **Hybrid Analysis Engine**: Local rule-based extractor + Gemini 2.5 Flash / Ollama LLM
- **RAG & Chat**: Contextual in-memory vector store with chunk embeddings and citation grounding

---

## Project Structure

```text
doclarity/
├── index.html               # Project Information Hub & Interactive Architecture Hub
├── DEPLOYMENT.md            # Production deployment instructions (Docker, VPS)
├── RAILWAY.md               # Railway Cloud hosting guide
├── docker-compose.yml       # Local development Docker setup
├── docker-compose.prod.yml  # Production Docker Compose setup
├── client/                  # React + Vite frontend SPA
│   ├── src/                 # Application components, pages, context, and services
│   ├── package.json
│   └── vite.config.js
└── server/                  # Express REST API & Analysis services
    ├── middleware/          # JWT authentication middleware
    ├── routes/              # Express API endpoints (auth, upload, analyze, chat, compare, secure)
    ├── services/            # Document parsing, spaCy NER, Gemini/Ollama LLM, RAG store
    └── package.json
```

---

## Local Development Setup

### 1. Environment Configuration

#### Backend Configuration (`server/.env`)

Create a `server/.env` file with the following variables:

```env
PORT=5000
NODE_ENV=development
AUTH_JWT_SECRET=replace_with_long_random_secret_at_least_32_chars
ANALYZE_ENGINE=hybrid
USE_OLLAMA_FOR_ANALYZE=false
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_ID=gemini-2.5-flash
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
SPACY_TIMEOUT_MS=10000
PYTHON_BIN=python
ALLOWED_ORIGIN=http://localhost:5173
```

#### Frontend Configuration (`client/.env`)

Create a `client/.env` file with the following variables:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

---

### 2. Run Local Servers

In two separate terminal sessions:

```bash
# Terminal 1: Backend API Server
cd server
npm install
npm run dev
```

```bash
# Terminal 2: Frontend Client SPA
cd client
npm install
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API Health Check**: `http://localhost:5000/api/health`
- **Project Information Hub**: Open `index.html` at the repository root.

---

## Docker Quickstart

```bash
# Local Development Stack with Hot Reload
docker-compose up --build

# Production Stack
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Key Deployment & Operational Notes

- **Production LLM Recommendation**: Railway and Cloud production deployments must configure `GEMINI_API_KEY` with `LLM_PROVIDER=gemini` for fast, scalable response times.
- **Local Ollama Support**: Ollama (`USE_OLLAMA_FOR_ANALYZE=true`) is supported for offline local development and self-hosted GPU setups.
- **Temporary Upload Storage**: Documents processed by Doclarity are stored temporarily in memory/ephemeral storage during analysis sessions.