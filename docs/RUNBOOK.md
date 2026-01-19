# Gemini Mortgage Concierge — Runbook

> **Operational Guide for Developers**

---

## Local Environment Setup

### 1. Clone Repository

```bash
git clone <repo-url>
cd mortgage-concierge-gemini
```

### 2. Configure Environment

```bash
# Create .env from template
cp .env.example .env

# Edit with your values
nano .env
```

**Required Variables:**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

**Optional (Camunda Orchestration):**
```bash
ZEEBE_CLIENT_ID=xxx
ZEEBE_CLIENT_SECRET=xxx
ZEEBE_CLOUD_CLUSTER_ID=xxx
ZEEBE_CLOUD_REGION=ont-1
```

### 3. Install Dependencies

```bash
npm install --prefix broker
npm install --prefix property-vision
npm install --prefix underwriter
npm install --prefix qa-agent
```

---

## Starting Services

### Option A: One Command

```bash
./start-gemini-swarm.sh
```

### Option B: Manual Start (for debugging)

```bash
# Terminal 1: Property Vision
cd property-vision && npm start

# Terminal 2: Underwriter
cd underwriter && npm start

# Terminal 3: QA Agent
cd qa-agent && npm start

# Terminal 4: Broker
cd broker && npm start

# Terminal 5: Frontend
cd "../AI Agent Chat Simple/frontend" && npm run dev
```

---

## Key Rotation

### Rotate Gemini API Key

1. **Generate new key** at https://aistudio.google.com/app/apikey
2. **Update .env** with new `GEMINI_API_KEY`
3. **Restart all agents** (they read env at startup)

```bash
# Kill all agents
pkill -f "node.*mortgage"

# Restart
./start-gemini-swarm.sh
```

### Rotate Camunda Credentials (if using)

1. **Generate new client** in Camunda Console
2. **Update .env:**
   ```bash
   ZEEBE_CLIENT_ID=new_client_id
   ZEEBE_CLIENT_SECRET=new_client_secret
   ```
3. **Restart broker only** (agents don't need Camunda creds)

---

## Refresh Regulation File Upload Cache

The Underwriter uploads `regulations.txt` to Gemini Files API at startup. To refresh:

### Option 1: Restart Underwriter

```bash
# Kill underwriter
pkill -f "underwriter"

# Restart
cd underwriter && npm start
```

### Option 2: Force Re-Upload

If the file was corrupted or you modified `regulations.txt`:

```bash
# Delete cached file (if stored locally)
rm -f underwriter/*.cache

# Restart underwriter
cd underwriter && npm start

# Verify in logs:
# "📤 Uploading Regulation Pack to Gemini Files API..."
# "✅ Regulations Uploaded: <file-uri>"
```

---

## Port Reference

| Service | Default Port | Override Env Var |
|---------|--------------|------------------|
| Frontend | 8100 | — |
| Broker | 4020 | — |
| Property Vision | 4023 | — |
| Underwriter | 4021 | — |
| QA Agent | 4024 | — |
| CORS Proxy | 4005 | — |

---

## Health Checks

```bash
# All services
for port in 4020 4021 4023 4024; do
  echo "Port $port:"
  curl -s http://localhost:$port/.well-known/agent-card.json 2>/dev/null | jq '.name' || echo "FAILED"
done
```

---

## Log Files

| Service | Log Location |
|---------|--------------|
| Property Vision | `property-vision.log` |
| Underwriter | `underwriter.log` |
| QA Agent | `qa-agent.log` |
| Broker | `broker.log` |

**View real-time logs:**
```bash
tail -f *.log
```

---

## Troubleshooting

### Agent Won't Start

```bash
# Check if port is in use
lsof -i :4023

# Kill zombie processes
pkill -f ngrok
pkill -f "node.*mortgage"
```

### Files API Upload Fails

1. Check `GEMINI_API_KEY` is valid
2. Check `regulations.txt` exists in `underwriter/`
3. Check file size (must be < 2GB)

### QA Loop Times Out

- Default timeout: 30 seconds
- QA Agent may be slow if using fallback model
- Check `qa-agent.log` for errors

---

## Backup & Restore

### Backup Current State

```bash
tar -czvf backup-$(date +%Y%m%d).tar.gz \
  .env \
  underwriter/regulations.txt \
  broker/src \
  property-vision/src \
  qa-agent/src
```

### Restore From Backup

```bash
tar -xzvf backup-YYYYMMDD.tar.gz
./start-gemini-swarm.sh
```
