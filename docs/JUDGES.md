# Judges Guide — Gemini Mortgage Concierge

> **One-Page Reference** | Gemini 3 AI Developer Competition

---

## What This Project Does

Automated mortgage pre-qualification that analyzes property photos and borrower financials to produce approve/deny decisions with regulation citations — in seconds instead of 30 days.

---

## Gemini 3 Features (Code Evidence)

### 1. Multimodal Vision ✅

**File:** `agents/property-vision/src/index.ts:163`

```typescript
inlineData: { data: base64Data, mimeType }
```

Real image bytes sent to Gemini 3.0 Flash — not URLs or metadata.

---

### 2. Files API + 1M Context ✅

**File:** `agents/underwriter/src/index.ts:60-66, 152`

```typescript
// Upload regulation file at startup
regulationFileUri = uploadResponse.file.uri;

// Reference in prompt
fileData: { mimeType: "text/plain", fileUri: regulationFileUri }
```

Regulation handbook loaded via Files API with actual file upload.

---

### 3. Autonomous Self-Correction ✅

**File:** `agents/underwriter/src/index.ts:172-212`

```typescript
if (qaJson.status === 'FAILED') {
    // Auto-fix triggered (bounded retry)
    const fixResult = await activeModel.generateContent(fixParts);
}
```

QA Agent verifies decisions, triggers bounded retry (max 2 attempts).

---

## What Makes This NOT a Chat Wrapper

| Feature | Evidence |
|---------|----------|
| **Multi-agent architecture** | 3 specialized agents with JSON-RPC contracts |
| **Real multimodal** | Base64 `inlineData`, not URL descriptions |
| **Real long context** | Files API `fileUri`, not RAG retrieval |
| **Autonomous correction** | Self-fix without human approval |

---

## Quick Verification Commands

```bash
# Check Gemini 3 model usage
grep -r "gemini-3" agents/*/src/*.ts

# Verify Files API
grep -r "fileUri\|uploadFile" agents/underwriter/src/index.ts

# Verify multimodal
grep -r "inlineData" agents/property-vision/src/index.ts

# Verify QA loop
grep -rn "FAILED" agents/underwriter/src/index.ts
```

---

## Demo Flow (2 minutes)

| Time | What to Show |
|------|--------------|
| 0:00 | Sample borrower data pre-filled |
| 0:30 | Load 3 property images |
| 1:00 | Files API badge during underwriting |
| 1:30 | QA verification results |
| 2:00 | Final decision with regulation citation |

---

## Quick FAQ

| Question | Answer |
|----------|--------|
| Is this a new project? | Yes, built for this hackathon |
| Does it require external services? | Only Gemini API key |
| Is multimodal real? | Yes, `inlineData` with base64 bytes |
| Is Files API real? | Yes, `fileUri` from actual upload |
