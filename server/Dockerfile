FROM node:22-bookworm-slim

WORKDIR /app

# Python is required for the spaCy-based entity extraction step.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY package*.json ./
RUN npm ci --omit=dev

RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir spacy \
  && python -m spacy download en_core_web_sm

COPY . .

RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
