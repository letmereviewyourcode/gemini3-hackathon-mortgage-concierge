# Gemini Mortgage Concierge — Google Cloud Run Deployment Plan

> **DO NOT DEPLOY** — This is a planning document only

---

## Overview

This plan describes how to deploy the Gemini Mortgage Concierge to Google Cloud Run. The architecture remains the same, but each service becomes a containerized Cloud Run service.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Cloud Project                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│  │   Frontend   │   │    Broker    │   │   CORS Proxy      │   │
│  │  (Cloud Run) │   │  (Cloud Run) │   │   (Cloud Run)     │   │
│  │  :8100 → 443 │   │  :4020 → 443 │   │   :4005 → 443     │   │
│  └──────┬───────┘   └──────┬───────┘   └───────────────────┘   │
│         │                  │                                    │
│         │       ┌──────────┴──────────┐                        │
│         │       │                     │                        │
│  ┌──────▼───────▼──┐  ┌──────────────▼──┐  ┌────────────────┐ │
│  │ Property Vision │  │   Underwriter   │  │    QA Agent    │ │
│  │   (Cloud Run)   │  │   (Cloud Run)   │  │   (Cloud Run)  │ │
│  │   :4023 → 443   │  │   :4021 → 443   │  │   :4024 → 443  │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Secret Manager                         │   │
│  │  GEMINI_API_KEY | ZEEBE_CLIENT_ID | ZEEBE_CLIENT_SECRET  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services to Deploy

| Service | Local Port | Cloud Run Service Name | Public? |
|---------|------------|------------------------|---------|
| Frontend | 8100 | `gemini-mortgage-frontend` | Yes |
| Broker | 4020 | `gemini-mortgage-broker` | Yes |
| Property Vision | 4023 | `gemini-mortgage-vision` | No (internal) |
| Underwriter | 4021 | `gemini-mortgage-underwriter` | No (internal) |
| QA Agent | 4024 | `gemini-mortgage-qa` | No (internal) |
| CORS Proxy | 4005 | `gemini-mortgage-proxy` | Yes |

---

## Required Dockerfiles

### 1. Property Vision (`property-vision/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Build TypeScript
RUN npm run build 2>/dev/null || echo "No build step"

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
```

### 2. Underwriter (`underwriter/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Include regulations file
COPY regulations.txt ./

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
```

### 3. QA Agent (`qa-agent/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
```

### 4. Broker (`broker/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
```

### 5. Frontend (`frontend/Dockerfile`)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

---

## Code Changes Required

### 1. Update Ports to Use `process.env.PORT`

Each service must listen on `process.env.PORT` (Cloud Run assigns this):

```typescript
// Change from:
const PORT = 4023;

// To:
const PORT = process.env.PORT || 4023;
```

**Files to update:**
- `property-vision/src/index.ts`
- `underwriter/src/index.ts`
- `qa-agent/src/index.ts`
- `broker/src/index.ts`

### 2. Update Service URLs

Replace localhost URLs with Cloud Run service URLs:

```typescript
// Change from:
const QA_AGENT_URL = 'http://localhost:4024';

// To:
const QA_AGENT_URL = process.env.QA_AGENT_URL || 'http://localhost:4024';
```

**Environment variables to add:**
- `BROKER_URL` → URL of broker service
- `VISION_URL` → URL of property-vision service
- `UNDERWRITER_URL` → URL of underwriter service
- `QA_AGENT_URL` → URL of qa-agent service

### 3. CORS Configuration

```typescript
// Update CORS to allow Cloud Run domains
app.use(cors({
  origin: [
    'https://gemini-mortgage-frontend-<hash>-uc.a.run.app',
    'http://localhost:8100'
  ]
}));
```

Or use wildcard for demo:
```typescript
app.use(cors({ origin: '*' }));
```

---

## Secret Manager Setup

### 1. Create Secrets

```bash
# Create GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY \
  --data-file=- <<< "your-gemini-api-key"

# Create Camunda secrets (optional)
gcloud secrets create ZEEBE_CLIENT_ID \
  --data-file=- <<< "your-client-id"
```

### 2. Grant Access to Cloud Run

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Deployment Checklist

### Phase 1: Prepare

- [ ] Update all services to use `process.env.PORT`
- [ ] Add environment variable support for service URLs
- [ ] Create Dockerfiles for each service
- [ ] Test Docker builds locally

### Phase 2: Create Cloud Resources

```bash
# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Set project
gcloud config set project YOUR_PROJECT_ID
```

### Phase 3: Deploy Services (Order Matters)

```bash
# 1. Deploy internal services first (no public ingress)
gcloud run deploy gemini-mortgage-vision \
  --source ./property-vision \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest

gcloud run deploy gemini-mortgage-underwriter \
  --source ./underwriter \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest

gcloud run deploy gemini-mortgage-qa \
  --source ./qa-agent \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest

# 2. Get internal URLs
VISION_URL=$(gcloud run services describe gemini-mortgage-vision --format='value(status.url)')
UW_URL=$(gcloud run services describe gemini-mortgage-underwriter --format='value(status.url)')
QA_URL=$(gcloud run services describe gemini-mortgage-qa --format='value(status.url)')

# 3. Deploy broker with service URLs
gcloud run deploy gemini-mortgage-broker \
  --source ./broker \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="VISION_URL=$VISION_URL,UNDERWRITER_URL=$UW_URL,QA_AGENT_URL=$QA_URL"

# 4. Get broker URL
BROKER_URL=$(gcloud run services describe gemini-mortgage-broker --format='value(status.url)')

# 5. Deploy frontend with broker URL
gcloud run deploy gemini-mortgage-frontend \
  --source ./frontend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="VITE_BROKER_URL=$BROKER_URL"
```

### Phase 4: Verify

```bash
# Get public URLs
gcloud run services list --format='table(metadata.name,status.url)'

# Test broker
curl https://gemini-mortgage-broker-<hash>-uc.a.run.app/health

# Test frontend
open https://gemini-mortgage-frontend-<hash>-uc.a.run.app
```

---

## Public Demo URL Structure

After deployment:

| Service | URL |
|---------|-----|
| Frontend | `https://gemini-mortgage-frontend-<hash>-uc.a.run.app` |
| Broker | `https://gemini-mortgage-broker-<hash>-uc.a.run.app` |

For cleaner URLs, configure custom domain mapping in Cloud Run.

---

## Cost Estimates

| Component | Estimated Monthly Cost |
|-----------|------------------------|
| Cloud Run (6 services, low traffic) | $10-30 |
| Secret Manager (5 secrets) | < $1 |
| Cloud Build (occasional) | < $5 |
| **Total (Demo)** | **~$15-40/month** |

Cloud Run charges per-request and per-second of execution. Low-traffic demo usage is very cheap.

---

## Latency Notes

- **Cold start**: 2-5 seconds for Node.js containers
- **Warm request**: < 500ms
- **Gemini API latency**: 2-10 seconds depending on model

To reduce cold starts:
```bash
# Set minimum instances (costs more)
gcloud run services update gemini-mortgage-broker \
  --min-instances=1
```

---

## CI/CD Suggestion (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: gemini-mortgage-broker
          source: ./broker
          region: us-central1
```

---

## Summary

**To deploy to Cloud Run:**

1. Add `Dockerfile` to each service
2. Update code to use `process.env.PORT` and service URLs
3. Create secrets in Secret Manager
4. Deploy services in order (internal first, then broker, then frontend)
5. Test public URLs

**DO NOT RUN THESE COMMANDS** — This is a planning document only.
