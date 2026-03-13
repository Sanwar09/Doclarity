# Railway Deployment

Doclarity is Railway-ready as a two-service monorepo deployment:

- [client](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\client) for the React app
- [server](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\server) for the Express API

## Recommended production mode

Use Gemini in Railway production and keep Ollama for local development.

Server env:

```env
NODE_ENV=production
AUTH_JWT_SECRET=replace_with_long_random_secret
LLM_PROVIDER=gemini
USE_OLLAMA_FOR_ANALYZE=false
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL_ID=gemini-2.5-flash
ANALYZE_ENGINE=hybrid
PYTHON_BIN=python3
SPACY_TIMEOUT_MS=10000
GOOGLE_CLIENT_ID=your_google_client_id
ALLOWED_ORIGIN=https://your-frontend-service.up.railway.app
```

Client env:

```env
VITE_API_URL=https://your-backend-service.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Railway service setup

1. Create a new Railway project from the GitHub repo.
2. Create a `server` service.
   Root directory: `doclarity/server`
   Config file path: `doclarity/server/railway.toml`
3. Create a `client` service.
   Root directory: `doclarity/client`
   Config file path: `doclarity/client/railway.toml`

## Notes

- Railway will assign `PORT` automatically.
- The backend already respects `ALLOWED_ORIGIN` for CORS.
- The frontend now uses `VITE_API_URL`, so it can talk to a separate Railway backend domain.
- Railway storage is ephemeral. This is fine for the current upload -> analyze flow, but not for long-term archive storage.
