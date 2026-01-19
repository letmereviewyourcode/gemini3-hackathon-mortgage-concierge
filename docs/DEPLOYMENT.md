# Gemini Mortgage Concierge — Deployment Guide

> **For Hackathon Judges & Developers** | January 2026

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Node.js | v18+ |
| npm | v9+ |
| Gemini API Key | [Get one here](https://aistudio.google.com/app/apikey) |
| Camunda 8.9 SaaS | Optional (for full orchestration) |

---

## Quick Start (One Command)

```bash
cd mortgage-concierge-gemini
./start-gemini-swarm.sh
```

This starts all services:
- Property Vision Agent → Port 4023
- Underwriter Agent → Port 4001
- QA Agent → Port 4024
- Broker → Port 4020

---

## Manual Startup

### 1. Environment Setup

Create `.env` files in each agent directory:

**mortgage-concierge-gemini/.env**
```bash
GEMINI_API_KEY=your_gemini_api_key

# Camunda 8.9 (optional)
ZEEBE_CLIENT_ID=your_client_id
ZEEBE_CLIENT_SECRET=your_client_secret
ZEEBE_CLOUD_CLUSTER_ID=your_cluster_id
ZEEBE_CLOUD_REGION=ont-1
```

### 2. Install Dependencies

```bash
# Install all agents
cd mortgage-concierge-gemini
npm install --prefix broker
npm install --prefix property-vision
npm install --prefix underwriter
npm install --prefix qa-agent

# Install frontend
cd "../AI Agent Chat Simple/frontend"
npm install
```

### 3. Start Services (Order Matters)

```bash
# Terminal 1: Start agents
cd mortgage-concierge-gemini
npm start --prefix property-vision &
npm start --prefix underwriter &
npm start --prefix qa-agent &
npm start --prefix broker &

# Terminal 2: Start frontend
cd "../AI Agent Chat Simple/frontend"
npm run dev
```

### 4. Verify All Services

| Service | Health Check |
|---------|--------------|
| Property Vision | `curl http://localhost:4023/.well-known/agent-card.json` |
| Underwriter | `curl http://localhost:4001/.well-known/agent-card.json` |
| QA Agent | `curl http://localhost:4024/.well-known/agent-card.json` |
| Broker | `curl http://localhost:4020/health` |
| Frontend | Open http://localhost:8100/projects/gemini-mortgage |

---

## Deploy BPMN to Camunda (Optional)

If using Camunda orchestration:

```bash
cd broker
node src/deploy-bpmn.js mortgage-concierge-wizard-e2e.bpmn
```

**Required Environment Variables:**
```bash
ZEEBE_CLIENT_ID=xxx
ZEEBE_CLIENT_SECRET=xxx
ZEEBE_CLOUD_CLUSTER_ID=xxx
ZEEBE_CLOUD_REGION=ont-1
```

---

## Deploy to Web Modeler (Optional)

Sync BPMN for visual editing:

```bash
cd broker
node src/sync-to-modeler.js [bpmn-file] [diagram-id]
```

**Find Diagram ID** in the Modeler URL:
```
https://modeler.camunda.io/diagrams/[DIAGRAM-ID]--filename
```

**Required Environment Variables:**
```bash
CAMUNDA_CONSOLE_CLIENT_ID=xxx
CAMUNDA_CONSOLE_CLIENT_SECRET=xxx
```

---

## Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 8100 | React + Vite dev server |
| Broker | 4020 | Express API + Zeebe workers |
| Property Vision | 4023 | Gemini 3.0 Flash agent |
| Underwriter | 4001 | Gemini 3.0 Pro + Files API |
| QA Agent | 4024 | Autonomous verification |
| CORS Proxy | 4005 | Image fetching |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "GEMINI_API_KEY not found" | Set in `.env` file in each agent directory |
| Sample images fail to load | Check CORS proxy on 4005; use manual upload |
| Agents timeout | Increase timeout; check Gemini API quota |
| DTI shows wrong value | Should be 31.6% for default inputs; refresh page |
| "Model not found" | Fallback to `gemini-2.0-flash-exp` should auto-trigger |

---

## Production Considerations

1. **Use ngrok** for public URLs if deploying agents remotely
2. **Monitor Gemini quotas** — each analysis uses ~10K tokens
3. **Cache Files API uploads** — regulations file only needs uploading once
4. **Add authentication** — current demo has no auth layer
