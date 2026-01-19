# Devpost Submission — Gemini Mortgage Concierge

> **Paste-Ready Content for Devpost**

---

## Short Description (200 words)

The **Gemini Mortgage Concierge** is a multi-agent AI system that revolutionizes mortgage pre-qualification by combining three flagship Gemini 3 capabilities: multimodal vision, the 1M token context window, and autonomous self-correction.

Traditional mortgage underwriting takes 30-45 days and relies on manual document review. Our system analyzes property photos in seconds using **Gemini 3.0 Flash** — identifying water damage, mold, structural issues, and other defects that text-based forms miss.

The **Underwriter Agent** (Gemini 3.0 Pro) loads the entire 500+ page Fannie Mae Selling Guide into its 1M token context window via the **Files API**, enabling precise regulation citations like "B3-6-02" without hallucination. A visual context meter shows 85K tokens loaded.

Most innovatively, our **QA Agent** acts as an autonomous auditor. It verifies every decision — checking DTI calculations, regulation citations, and credit thresholds. If errors are found, it returns `FAILED` with feedback, and the Underwriter automatically re-generates a corrected decision. This self-correction loop catches hallucinations before they reach the user.

The result: 30 days reduced to 30 seconds, with explainable, auditable, compliant decisions.

---

## How We Used Gemini 3

### Models Used
- **Gemini 3.0 Flash Preview** — Property Vision Agent (multimodal image analysis)
- **Gemini 3.0 Pro Preview** — Underwriter Agent (regulatory reasoning + Files API)
- **Gemini 3.0 Pro Preview** — QA Agent (adversarial verification)

### Multimodal Analysis
- Property images converted to base64
- Sent via `inlineData` to `generateContent()`
- Model analyzes actual pixels: "water stains on ceiling", "cracked foundation"
- Returns condition score (1-10) with defect list

### Files API (Long Context)
- Fannie Mae regulation file uploaded at startup via `GoogleAIFileManager`
- `fileUri` referenced in every underwriting request
- ~85K tokens loaded into context
- Enables precise regulation citations without RAG

### Autonomous QA Loop
- Underwriter sends decision to QA Agent
- QA uses "thought signature" prompting for structured reasoning
- Returns `PASSED` or `FAILED` with feedback
- On `FAILED`, Underwriter auto-fixes and re-generates
- Bounded to prevent infinite loops

---

## Why This is NOT a Chat Wrapper

This project is fundamentally different from chat wrappers:

1. **Real Multimodal** — We send actual image bytes to Gemini, not prompts describing images. The model sees water stains, mold, cracks.

2. **Long Context via Files API** — We don't RAG or summarize regulations. The entire handbook is in context, enabling precise citations.

3. **Multi-Agent Architecture** — Three specialized agents with clear contracts, not one "God Model" doing everything.

4. **Autonomous Self-Correction** — The QA Agent catches its own mistakes. No human approval needed for retry.

5. **Production-Ready Contracts** — JSON-RPC 2.0 (A2A protocol), agent cards, structured outputs.

---

## 3-Minute Demo Script

### 0:00–0:30 | Introduction
- "This is the Gemini Mortgage Concierge — a multi-agent swarm for mortgage pre-qualification"
- Point out: "Gemini 3.0 Multi-Agent Swarm" badge
- "Real multimodal analysis — not a chat wrapper"

### 0:30–1:00 | Borrower Input
- Pre-filled: Alice Chen, $95K income, $2,500 monthly debts, 720 credit
- "DTI auto-calculates to 31.6% — below the 43% threshold"
- Click "🏠 Modern Home" → 3 images load

### 1:00–2:00 | Run Analysis
- Click "Start Analysis" → Watch pipeline:
  - "Property Vision Agent — Gemini 3.0 Flash — analyzing actual image pixels"
  - "Underwrite + Files API — loading Fannie Mae handbook — 85K tokens"
  - Point: "See the context meter — 8.5% of 1M window used"
  - "QA Agent — autonomously verifying the decision"

### 2:00–2:45 | View Report
- Decision: APPROVED
- "All 3 images we uploaded are displayed — proof of multimodal"
- "Files API Context Window — 85K tokens from Fannie Mae Selling Guide"
- "Regulation cited: B3-6-02 — that's the real section for DTI limits"
- "QA verification grid — 5 automated checks"

### 2:45–3:00 | Conclusion
- Click "Download PDF" — "Professional report for loan officers"
- "Traditional underwriting: 30 days. Gemini Mortgage Concierge: 30 seconds."

---

## Judges FAQ

### Q1: Is the multimodal analysis real?
**Yes.** `property-vision/src/index.ts:163` sends base64 image data via `inlineData` to `generateContent()`. No URLs, no metadata — actual image bytes.

### Q2: Is the Files API usage real?
**Yes.** `underwriter/src/index.ts:60` uploads `regulations.txt` via `GoogleAIFileManager`, and line 152 references `fileUri` in the prompt.

### Q3: How is the QA loop "autonomous"?
The Underwriter calls the QA Agent directly (line 172). If QA returns `status: 'FAILED'`, the Underwriter re-prompts (line 184-204) without human intervention.

### Q4: What prevents infinite retry loops?
The current implementation has a single retry. See lines 165-212 — only one re-generation attempt per request.

### Q5: Is this a new project?
Yes. The codebase was built for this hackathon. Camunda references are for optional orchestration (not required to run).

### Q6: What Gemini 3 models are used?
- `gemini-3.0-flash-preview` — Property Vision
- `gemini-3.0-pro-preview` — Underwriter + QA Agent

### Q7: How do I reproduce the demo?
```bash
cd mortgage-concierge-gemini
./start-gemini-swarm.sh
# Open: http://localhost:8100/projects/gemini-mortgage
```

### Q8: What makes this innovative?
The autonomous QA loop + visual Files API context meter + multi-agent architecture. We don't just call Gemini — we build a self-correcting system.
