# Doclarity

Doclarity is an AI-powered legal document intelligence app. Users can upload legal documents, get structured analysis for a dashboard, and ask grounded follow-up questions through a document-aware chatbot.

## Current stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Parsing: `pdfjs-dist`, `mammoth`, OCR support
- Analysis: hybrid structured extraction pipeline
- LLM providers:
  - Local development: Ollama supported
  - Production: Gemini recommended on Railway

## Project structure

```text
doclarity/
  client/   React application
  server/   Express API and analysis pipeline
```

## Local development

### Backend

Create [server/.env](C:\Users\Mohit%20Khairnar\Desktop\Doclarity\doclarity\server\.env):

```env
PORT=5000
NODE_ENV=development
AUTH_JWT_SECRET=replace_with_long_random_secret
ANALYZE_ENGINE=hybrid
USE_OLLAMA_FOR_ANALYZE=false
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL_ID=gemini-2.5-flash
GOOGLE_CLIENT_ID=your_google_client_id
SPACY_TIMEOUT_MS=10000
PYTHON_BIN=python
ALLOWED_ORIGIN=http://localhost:5173
```

### Frontend

Create [client/.env](C:\Users\Mohit%20Khairnar\Desktop\Doclarity\doclarity\client\.env):

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Run

In two terminals:

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend health: `http://localhost:5000/api/health`

## Deployment

- Railway: see [RAILWAY.md](C:\Users\Mohit%20Khairnar\Desktop\Doclarity\doclarity\RAILWAY.md)
- Docker/VPS: see [DEPLOYMENT.md](C:\Users\Mohit%20Khairnar\Desktop\Doclarity\doclarity\DEPLOYMENT.md)

## Notes

- Railway production should use Gemini, not Ollama.
- Ollama support remains in the codebase for local development and future infrastructure changes.
- Uploaded files are temporary and should not be treated as long-term storage.
