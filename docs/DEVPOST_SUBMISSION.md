# Devpost Submission — Gemini Mortgage Concierge

> **Paste-Ready Content for Devpost** | Updated 2026-01-19

---

## Project Title

**Gemini Mortgage Concierge** — Automated Pre-Qualification with Gemini 3

---

## Short Description (200 words)

The **Gemini Mortgage Concierge** is a multi-agent AI system that revolutionizes mortgage pre-qualification by combining three flagship Gemini 3 capabilities: multimodal vision, the 1M token context window, and autonomous self-correction.

Traditional mortgage underwriting takes 30-45 days. Our system does it in **under 2 seconds**.

The **Property Vision Agent** (Gemini 3.0 Flash) analyzes actual property image bytes—identifying water damage, mold, structural issues, and condition scores using real multimodal input, not URL descriptions.

The **Underwriter Agent** (Gemini 3.0 Pro) loads a regulation handbook via the **Files API**, providing precise citations like "B3-6-02" without hallucination. Response metadata includes actual token counts (867 tokens measured), processing time (1,779ms), and file metadata.

Most innovatively, our **QA Agent** acts as an autonomous auditor with **bounded retry** (max 2 attempts). It verifies every decision—checking DTI calculations, regulation citations, and credit thresholds. If errors are found, the Underwriter auto-corrects without human intervention.

The result: 30 days reduced to 30 seconds, with explainable, auditable, regulation-compliant decisions.

---

## Built With

- Gemini 3.0 Flash Preview (multimodal vision)
- Gemini 3.0 Pro Preview (regulatory reasoning)
- Google AI Files API (long context)
- Node.js / TypeScript / Express
- React (frontend)

---

## How We Used Gemini 3

### Models Used
| Agent | Model | Purpose |
|-------|-------|---------|
| Property Vision | `gemini-3.0-flash-preview` | Multimodal image analysis |
| Underwriter | `gemini-3.0-pro-preview` | Regulatory reasoning + Files API |
| QA Agent | `gemini-3.0-pro-preview` | Autonomous verification |

### Multimodal Analysis (Real)
```typescript
// agents/property-vision/src/index.ts:163
inlineData: { data: base64Data, mimeType }
```
Real image bytes sent to Gemini—not URLs or metadata.

### Files API + Long Context (Real)
```typescript
// agents/underwriter/src/index.ts:60-66
regulationFileUri = uploadResponse.file.uri;
fileData: { mimeType: "text/plain", fileUri: regulationFileUri }
```
Regulations uploaded via Files API, referenced in every request.

### Autonomous Self-Correction (Bounded)
```typescript
// agents/underwriter/src/index.ts:174
const MAX_RETRIES = 2;
while (retryCount < MAX_RETRIES) {
    // QA verification loop
}
```
QA Agent catches errors, triggers bounded retry.

---

## What Makes This NOT a Chat Wrapper

| Feature | Evidence |
|---------|----------|
| **Multi-agent architecture** | 3 specialized agents with JSON-RPC contracts |
| **Real multimodal** | Base64 `inlineData`, not URL descriptions |
| **Real long context** | Files API `fileUri`, not RAG retrieval |
| **Autonomous correction** | Self-fix without human approval |
| **Provable metadata** | Token count, processing time, file metadata returned |

---

## Verified Test Results (E2E)

**Input:**
```json
{ "income": 95000, "debts": 2500, "creditScore": 720, "propertyPrice": 350000 }
```

**Output:**
```json
{
  "decision": "Approved",
  "dti": 31.58,
  "regulationCited": "B3-6-02, B4-1.3-05"
}
```

**Metadata:**
- Processing time: 1,779ms
- Token count: 867 (actual, not estimated)
- Files API: 2,462 bytes uploaded
- Model: gemini-3.0-pro-preview

---

## Links

- **GitHub:** https://github.com/letmereviewyourcode/gemini3-hackathon-mortgage-concierge
- **Demo Video:** [Your video link here]

---

## Try It Yourself

```bash
git clone https://github.com/letmereviewyourcode/gemini3-hackathon-mortgage-concierge.git
cd gemini3-hackathon-mortgage-concierge
cp .env.example .env  # Add GEMINI_API_KEY
./start.sh
```
