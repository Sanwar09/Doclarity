FROM node:22-bookworm-slim

WORKDIR /app

# Python is required for the spaCy-based entity extraction step.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

RUN python3 -m pip install --break-system-packages --no-cache-dir spacy \
  && python3 -m spacy download en_core_web_sm

COPY . .

RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
