# Gemini Mortgage Concierge 🏠

> **Gemini 3 AI Developer Competition** | January 2026

**[Launch Live Demo 🚀](https://gemini-frontend-231423721146.us-central1.run.app)** | **[Watch 3-min Video 🎥](#)** | **[Read Submission Text 📄](docs/submission-pack/FINAL_DEVPOST_TEXT.md)**

![Status](https://img.shields.io/badge/Status-Live%20%26%20Secured-success?style=for-the-badge) ![Gemini](https://img.shields.io/badge/AI-Gemini%203.0-8E75B2?style=for-the-badge)

> [!IMPORTANT]
> **Yes, you can run this live!** 
> To control API costs for Gemini 3.0 Pro/Flash, we have gated the analysis.
> **Judges**: The required **Access Code** is available in the **"Judge's Notes"** or **"Additional Info"** section of our Devpost submission.
>
> **60-Second Test Drive**:
> 1. Click **[Launch Live Demo](https://gemini-frontend-231423721146.us-central1.run.app)**.
> 2. Select **"🏠 Modern Home"** from the Quick Scenarios.
> 3. Click the purple **"Start Analysis"** button.
> 4. **WHEN PROMPTED**: Enter Code: `GeminiJudge2026`
>
> ![Enter Access Code](docs/images/access-modal-guide.png)
>
> 5. Watch Gemini 3.0 Flash & Pro automate the underwriting in seconds.

---

## 🤖 Gemini 3.0 Integration
This is not just a chat wrapper. We use the full capabilities of the Gemini 3.0 suite:
1.  **Gemini 3.0 Flash (Vision)**: We stream raw image bytes (not text descriptions) to the model. It "looks" at property photos to detect mold, cracks, and finish quality, assigning a structured 1-10 condition score.
2.  **Gemini 3.0 Pro (Files API)**: We load the **entire Fannie Mae Selling Guide (~85k tokens)** into the context window. The Underwriter agent references specific regulation codes (e.g., *B3-6-02*) in real-time, enforcing compliance with audit-grade precision.
3.  **High-Agency Correction**: A dedicated QA Agent acts as an adversarial loop, autonomously rejecting and correcting hallucinations or math errors before the user sees them.

---

## ✨ Features Sequence


| Feature | Implementation | Model |
|---------|----------------|-------|
| **Multimodal Vision** | Analyzes property image bytes via `inlineData` | Gemini 3.0 Flash |
| **1M Context Window** | Loads 85K+ token regulation handbook via Files API | Gemini 3.0 Pro |
| **Self-Correction** | QA Agent verifies decisions, triggers auto-fix on errors | Gemini 3.0 Pro |

---

## 🏗️ Architecture

```mermaid
graph TD
    A[Frontend UI] --> B[Broker API]
    B --> C[Property Vision Agent]
    B --> D[Underwriter Agent]
    D --> E[QA Agent]
    D -.->|Auto-fix on FAIL| D
    
    C -->|Gemini 3.0 Flash| F[Image Analysis]
    D -->|Gemini 3.0 Pro| G[Regulatory Reasoning]
    E -->|Gemini 3.0 Pro| H[Verification Loop]
    
    subgraph "Files API"
        I[regulations.txt<br>~85K tokens]
    end
    D --> I
```

**Pure Gemini 3 agents** with lightweight local orchestration.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+
- [Gemini API Key](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# 2. Start all services
chmod +x start.sh && ./start.sh

# 3. Open browser (if frontend available)
open http://localhost:8100/projects/gemini-mortgage
```

### Smoke Test

```bash
# Check broker health
curl http://localhost:4020/health
# Expected: {"status":"ok","mode":"standalone"}

# Check agents
curl http://localhost:4023/.well-known/agent-card.json | jq '.name'
# Expected: "Property Vision Agent"

curl http://localhost:4001/.well-known/agent-card.json | jq '.name'
# Expected: "Underwriter Agent"
```

### Sample Analysis

```bash
curl -X POST http://localhost:4020/api/gemini-wizard \
  -H "Content-Type: application/json" \
  -d '{
    "borrower": {
      "name": "Alice Chen",
      "income": 95000,
      "monthlyDebts": 2500,
      "creditScore": 720,
      "propertyPrice": 350000
    },
    "property": {
      "inputType": "demo",
      "videoUrl": "https://www.youtube.com/watch?v=pQrS_qTv3M0"
    }
  }'
```

---

## 📁 Structure

```
gemini-mortgage-concierge/
├── agents/
│   ├── property-vision/   # Gemini 3.0 Flash - Image analysis
│   ├── underwriter/       # Gemini 3.0 Pro + Files API
│   └── qa-agent/          # Autonomous verification
├── broker/                # Standalone orchestrator
├── frontend/              # React UI (optional)
├── docs/                  # Documentation
├── testdata/              # Sample inputs
├── demo-assets/           # Sample images
├── start.sh               # One-command startup
└── .env.example           # Environment template
```

---

## 💡 Why This is NOT a Chat Wrapper

1. **Real Multimodal** — Image bytes via `inlineData`, not URL descriptions
2. **Files API Context** — Entire regulation handbook loaded, not RAG chunks
3. **Multi-Agent Architecture** — Specialized agents with clear contracts
4. **Self-Correction Loop** — QA catches and fixes hallucinations autonomously
5. **Production Contracts** — JSON-RPC 2.0, agent cards, structured outputs

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `GEMINI_API_KEY not found` | Add to `.env` file |
| Agent timeout | Check logs: `tail -f *.log` |
| Port in use | `pkill -f 'property-vision\|underwriter\|qa-agent'` |
| Model unavailable | Falls back to `gemini-2.0-flash-exp` |

---

## 📚 Documentation

- [JUDGES.md](docs/JUDGES.md) — One-page judge guide
- [TESTING.md](docs/TESTING.md) — Test commands
- [DEVPOST_SUBMISSION.md](docs/DEVPOST_SUBMISSION.md) — Submission content
