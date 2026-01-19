# Gemini Mortgage Concierge — Handoff Guide

> **For Developers Taking Over This Project** | January 2026

---

## Project Overview

The **Gemini Mortgage Concierge** is a multi-agent AI system for mortgage pre-qualification. It demonstrates three flagship Gemini 3 capabilities:

| Feature | Agent | Model |
|---------|-------|-------|
| Multimodal Vision | Property Vision | Gemini 3.0 Flash |
| 1M Context Window | Underwriter | Gemini 3.0 Pro + Files API |
| Self-Correction | QA Agent | Gemini 3.0 Pro |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│          GeminiMortgage.tsx (Port 8100)                      │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                      Broker (Port 4020)                      │
│   Express API + Zeebe Workers + A2A Proxy                    │
└──────┬──────────────────┬──────────────────────┬─────────────┘
       │                  │                      │
┌──────▼─────┐     ┌──────▼───────┐      ┌──────▼──────┐
│ Property   │     │ Underwriter  │      │  QA Agent   │
│ Vision     │     │ + Files API  │◄────►│ (Verifier)  │
│ Port 4023  │     │  Port 4001   │      │  Port 4024  │
└────────────┘     └──────────────┘      └─────────────┘
```

---

## Repository Structure

```
mortgage-concierge-gemini/
├── broker/                     # Central orchestration
│   ├── src/index.ts           # Zeebe workers + A2A proxy (1199 lines)
│   ├── resources/             # BPMN processes
│   └── package.json
│
├── property-vision/            # Multimodal analysis
│   ├── src/index.ts           # Gemini 3.0 Flash
│   ├── agent-card.json        # A2A manifest
│   └── package.json
│
├── underwriter/                # Financial assessment
│   ├── src/index.ts           # Gemini 3.0 Pro + Files API
│   ├── regulations.txt        # Fannie Mae excerpts (~85K tokens)
│   ├── agent-card.json
│   └── package.json
│
├── qa-agent/                   # Autonomous verification
│   ├── src/index.ts
│   ├── agent-card.json
│   └── package.json
│
├── scripts/                    # Deployment utilities
├── docs/                       # Documentation
├── demo-assets/               # Sample images
└── start-gemini-swarm.sh      # One-command startup
```

### Frontend Location
```
../AI Agent Chat Simple/frontend/src/pages/GeminiMortgage.tsx
```

---

## Agent Details

### 1. Property Vision Agent (Port 4023)

**File:** `property-vision/src/index.ts`

**Models (in priority order):**
1. `gemini-3.0-flash-preview` (target)
2. `gemini-2.0-flash-exp` (fallback)

**Capabilities:**
- Analyzes up to 5 base64 images
- Identifies defects: water damage, mold, cracks, outdated systems
- Returns condition score (1-10) + defect list + summary

**Input Modes:**
| Mode | Description |
|------|-------------|
| `images` | Real multimodal analysis of uploaded base64 images |
| `listing` | Scrapes images from real estate listing URL |
| `demo` | Simulated analysis (labeled) for quick demos |

**Agent Card:**
```json
{
  "name": "Property Vision Agent",
  "url": "http://localhost:4023",
  "capabilities": [{ "name": "AnalyzePropertyVideo" }]
}
```

---

### 2. Underwriter Agent (Port 4001)

**File:** `underwriter/src/index.ts`

**Models:**
1. `gemini-3.0-pro-preview` (target)
2. `gemini-2.0-flash-exp` (fallback)

**Key Feature: Files API**
```typescript
// On startup, upload regulation file
const uploadResult = await fileManager.uploadFile(regulationPath, {
  mimeType: "text/plain",
  displayName: "Fannie Mae Selling Guide"
});
regulationFileUri = uploadResult.file.uri;

// In requests, reference the uploaded file
const response = await model.generateContent([
  { fileData: { mimeType: "text/plain", fileUri: regulationFileUri } },
  { text: "Analyze against regulations..." }
]);
```

**Self-Correction Loop:**
1. Underwriter generates initial decision
2. Calls QA Agent to verify
3. If QA returns `FAILED`, Underwriter auto-fixes
4. Returns verified decision

**Agent Card:**
```json
{
  "name": "Underwriter Agent",
  "url": "http://localhost:4001",
  "capabilities": [{ "name": "AnalyzeRisk" }]
}
```

---

### 3. QA Agent (Port 4024)

**File:** `qa-agent/src/index.ts`

**Purpose:** Autonomous verification loop

**Checks Performed:**
1. DTI calculation accuracy
2. Regulation citation validity
3. Credit threshold compliance
4. Property score consistency
5. Hallucination detection

**Response Format:**
```json
{
  "status": "PASSED" | "FAILED",
  "feedback": "Specific issue description",
  "checks": {
    "dti": true,
    "regulation": true,
    "credit": true,
    "property": true,
    "hallucination": true
  }
}
```

---

## Broker Service (Port 4020)

**File:** `broker/src/index.ts` (1199 lines)

### Zeebe Workers

| Task Type | Purpose |
|-----------|---------|
| `a2a-agent-call` | Proxies A2A calls to local agents |
| `io.camunda.agenticai:a2aclient:0` | Official connector polyfill |
| `update-ui-state` | Sends progress updates to frontend |
| `synthesize-recommendation` | Combines agent outputs |
| `wizard-complete` | Marks process complete |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gemini-wizard` | POST | Start analysis (from frontend) |
| `/api/gemini-wizard/:id` | GET | Poll for results |
| `/health` | GET | Health check |

---

## Frontend (GeminiMortgage.tsx)

**Location:** `../AI Agent Chat Simple/frontend/src/pages/GeminiMortgage.tsx`

### Key Components

| Component | Description |
|-----------|-------------|
| Borrower Profile | Income, debts, credit score, property price |
| Property Input | Image upload, URL mode, sample scenarios |
| Processing Pipeline | Progress steps with Files API indicator |
| Report Tab | Decision, images, QA grid, PDF export |

### Sample Scenarios

Each loads 3 images:
```typescript
const SAMPLE_SCENARIOS = {
  good: { label: '🏠 Modern Home', images: [...] },
  average: { label: '📦 Average', images: [...] },
  bad: { label: '🏚️ Needs Work', images: [...] }
};
```

### Files API Visualization

The UI prominently displays:
- Context meter (85K / 1M tokens)
- Document name (Fannie Mae Selling Guide)
- Progress bar showing utilization

---

## Environment Variables

### Root Directory (.env)
```bash
GEMINI_API_KEY=your_gemini_api_key

# Camunda 8.9 (optional)
ZEEBE_CLIENT_ID=xxx
ZEEBE_CLIENT_SECRET=xxx
ZEEBE_CLOUD_CLUSTER_ID=xxx
ZEEBE_CLOUD_REGION=ont-1
```

### Agent-Specific
Each agent reads `GEMINI_API_KEY` from root `.env` or its own.

---

## Startup Sequence

### Recommended (One Command)
```bash
cd mortgage-concierge-gemini
./start-gemini-swarm.sh
```

### Manual (Order Matters)
1. **Property Vision:** `npm start --prefix property-vision`
2. **QA Agent:** `npm start --prefix qa-agent`
3. **Underwriter:** `npm start --prefix underwriter` (depends on QA)
4. **Broker:** `npm start --prefix broker`
5. **Frontend:** `cd ../AI\ Agent\ Chat\ Simple/frontend && npm run dev`

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "GEMINI_API_KEY not found" | Missing env | Add to `.env` |
| "Model not found" | Preview access | Auto-falls back to `gemini-2.0-flash-exp` |
| Sample images fail | CORS | Check proxy on 4005; use manual upload |
| QA always fails | Strict prompts | Check QA agent logs for feedback |
| DTI wrong | Calculation | Should be 31.6% for $95K income, $2.5K debts |

### Debug Commands
```bash
# Check agent health
curl http://localhost:4023/.well-known/agent-card.json
curl http://localhost:4001/.well-known/agent-card.json
curl http://localhost:4024/.well-known/agent-card.json

# Check broker health
curl http://localhost:4020/health

# View logs
tail -f property-vision.log
tail -f underwriter.log
tail -f qa-agent.log
```

---

## Key Learnings

### 1. Files API Context Caching
The regulation file is uploaded **once** at startup and reused across requests. This saves quota and improves response time.

### 2. Model Fallbacks
Each agent tries Gemini 3.0 first, then falls back:
```typescript
async function getModel() {
  try {
    return genAI.getGenerativeModel({ model: "gemini-3.0-flash-preview" });
  } catch (e) {
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }
}
```

### 3. Self-Correction Loop
The Underwriter → QA → Underwriter loop catches hallucinations:
```typescript
const qaResult = await axios.post(QA_AGENT_URL, { decisionPack });
if (qaResult.status === 'FAILED') {
  // Re-generate with fix
  const fixedDecision = await model.generateContent([
    { text: `Fix: ${qaResult.feedback}` },
    { text: JSON.stringify(decisionPack) }
  ]);
}
```

### 4. A2A Protocol
Agents communicate via JSON-RPC 2.0:
```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": { "data": { ... } },
  "id": 1234567890
}
```

---

## Future Enhancements

1. **Video Analysis** — Real-time property walkthrough streaming
2. **Document Upload** — Analyze tax returns, pay stubs via multimodal
3. **Multi-Agent Orchestration** — Full Camunda process with A2A connector
4. **Voice Interface** — Loan officer voice commands
5. **Production Deployment** — Add auth, rate limiting, monitoring
