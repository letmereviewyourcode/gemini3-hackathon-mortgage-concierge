# Judges Guide — Gemini Mortgage Concierge

> **One-Page Reference** | Gemini 3 AI Developer Competition

---

## What This Project Does

Automated mortgage pre-qualification that analyzes property photos and borrower financials to produce approve/deny decisions with regulation citations — in seconds instead of 30 days.

---

## Gemini 3 Features (Code Evidence)

### 1. Multimodal Vision ✅

**File:** `agents/property-vision/src/index.ts`
**Line:** 163

```typescript
inlineData: { data: base64Data, mimeType }
```

Real image bytes sent to Gemini 3.0 Flash — not URLs or metadata.

---

### 2. Files API + 1M Context ✅

**File:** `agents/underwriter/src/index.ts`
**Lines:** 60-66, 152

```typescript
// Upload regulation file
regulationFileUri = uploadResponse.file.uri;

// Use in request
fileData: { mimeType: "text/plain", fileUri: regulationFileUri }
```

Entire Fannie Mae handbook (~85K tokens) loaded via Files API.

---

### 3. Autonomous Self-Correction ✅

**File:** `agents/underwriter/src/index.ts`
**Lines:** 172-212

```typescript
if (qaJson.status === 'FAILED') {
    // Auto-fix triggered
    const fixResult = await activeModel.generateContent(fixParts);
}
```

QA Agent verifies decisions, triggers bounded retry (max 2 attempts).

---

## Key Differentiators

| Criterion | Evidence |
|-----------|----------|
| **Not a chat wrapper** | Multi-agent architecture, structured JSON-RPC |
| **Real multimodal** | Base64 inlineData, not URL descriptions |
| **Real long context** | Files API fileUri, not RAG retrieval |
| **Autonomous** | Self-correction without human approval |

---

## Quick Verification

```bash
# 1. Check agents use Gemini 3
grep -r "gemini-3" agents/*/src/*.ts

# 2. Verify Files API
grep -r "fileUri\|uploadFile" agents/underwriter/src/index.ts

# 3. Verify multimodal
grep -r "inlineData" agents/property-vision/src/index.ts

# 4. Verify QA loop
grep -r "FAILED.*Auto-Fix\|status.*FAILED" agents/underwriter/src/index.ts
```

---

## Demo Highlights

1. **0:30** — Sample images load (3 property photos)
2. **1:00** — "Files API" badge appears during underwriting
3. **1:30** — Context meter shows 85K/1M tokens
4. **2:00** — QA verification grid displays
5. **2:30** — PDF export with embedded images

---

## Questions?

| Q | A |
|---|---|
| Is this new? | Yes, built for this hackathon |
| Does it need Camunda? | No, standalone broker |
| Real multimodal? | Yes, check Line 163 |
| Files API real? | Yes, check Line 152 |
