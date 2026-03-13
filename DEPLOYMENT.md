# Doclarity Deployment

This project is easiest to deploy on a Linux VPS using Docker Compose because the backend uses:

- Node.js
- Python + spaCy
- OCR/image analysis
- file uploads
- optional Ollama/Gemini integrations

## Recommended production path

Use a VPS such as:

- Hostinger VPS
- DigitalOcean Droplet
- Hetzner Cloud
- AWS EC2

This keeps the stack simple and avoids PaaS limits around Python model installs, OCR, and local LLM tooling.

## Railway-ready path

This repo now supports a clean Railway split deployment:

- `server` service on Railway using the existing Dockerfile
- `client` service on Railway using Vite build output and `serve`

For Railway production, keep Ollama local and use Gemini in the cloud:

```env
LLM_PROVIDER=gemini
USE_OLLAMA_FOR_ANALYZE=false
```

## What is included

Production deployment files are included for:

- [server/Dockerfile](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\server\Dockerfile)
- [client/Dockerfile.prod](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\client\Dockerfile.prod)
- [client/nginx.conf](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\client\nginx.conf)
- [docker-compose.prod.yml](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\docker-compose.prod.yml)

## Server `.env`

Start from [server/.env.production.example](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\server\.env.production.example).

Your production [server/.env](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\server\.env) should include at least:

```env
PORT=5000
NODE_ENV=production
AUTH_JWT_SECRET=replace_with_long_random_secret

LLM_PROVIDER=ollama
USE_OLLAMA_FOR_ANALYZE=true
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_CHAT_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=90000
REASONING_MODELS=qwen2.5:7b,deepseek-r1:8b,llama3.1:8b
ENABLE_EMBEDDINGS_FOR_LONG_DOCS=true
OLLAMA_EMBED_MODEL=nomic-embed-text

GEMINI_API_KEY=your_gemini_key_if_used
GEMINI_MODEL_ID=gemini-2.5-flash

GOOGLE_CLIENT_ID=your_google_client_id
PYTHON_BIN=python3
SPACY_TIMEOUT_MS=10000
ALLOWED_ORIGIN=https://your-domain.com
```

If you do not want Ollama in production, use:

```env
LLM_PROVIDER=gemini
USE_OLLAMA_FOR_ANALYZE=false
```

## Client `.env`

For production Docker + nginx, the frontend uses same-origin `/api`, so [client/.env](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\client\.env) is only needed for local development.

If you still want a production template, use [client/.env.production.example](C:\Users\Mohit Khairnar\Desktop\Doclarity\doclarity\client\.env.production.example).

For Railway client deployment, set:

```env
VITE_API_URL=https://your-backend-service.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Railway deploy steps

1. Create a Railway project from this GitHub repo.
2. Add a `server` service with root directory `doclarity/server`.
3. Add a `client` service with root directory `doclarity/client`.
4. In the `server` service, set:

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

5. In the `client` service, set:

```env
VITE_API_URL=https://your-backend-service.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

6. Deploy both services.

Notes for Railway:

- Railway filesystem is ephemeral, so uploads are not long-term storage.
- The current flow is still fine because files are analyzed immediately after upload.
- If you later need persistent file history, move uploads to S3 or Cloudinary.

## Deploy steps

1. Install Docker and Docker Compose on the VPS.
2. Clone the repo onto the VPS.
3. Add the production `server/.env`.
4. If using Ollama on the VPS host, install it on the host machine and pull your models.
5. From the repo root run:

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

Or use the included helper scripts:

```powershell
./deploy-prod.ps1
```

Linux:

```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

6. Open:

- `http://YOUR_SERVER_IP`

## If using Ollama on the VPS host

Install Ollama on the host, not inside the client/server containers.

Then pull the models you need:

```powershell
ollama pull llama3.1:8b
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

If Docker cannot reach the host Ollama instance on Linux, replace `OLLAMA_BASE_URL` with the actual host IP, for example:

```env
OLLAMA_BASE_URL=http://172.17.0.1:11434
```

## Domain and HTTPS

For production, put Cloudflare or Nginx Proxy Manager in front, or attach your own reverse proxy with SSL.

At minimum:

- Point your domain DNS to the VPS IP
- Set `ALLOWED_ORIGIN=https://your-domain.com`
- Terminate SSL at the reverse proxy

## Health check

Backend health endpoint:

```text
/api/health
```

## Notes

- Uploaded files are stored in a Docker volume: `doclarity_uploads`
- The backend image installs `spaCy` and `en_core_web_sm`
- OCR and analysis can increase memory usage, so a 4 GB VPS is a practical minimum
