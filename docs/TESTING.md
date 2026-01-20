# Gemini Mortgage Concierge — Testing Guide

> **Test Commands & Expected Outputs**

---

## Unit Tests

### Property Vision Agent

```bash
cd property-vision
npm test
```

**Manual Test (JSON-RPC):**
```bash
curl -X POST http://localhost:4023 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "params": {
      "data": {
        "inputType": "demo",
        "videoUrl": "https://www.youtube.com/watch?v=pQrS_qTv3M0",
        "propertyType": "Single Family Home"
      }
    },
    "id": 1
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": { "state": "completed" },
    "artifacts": [
      {
        "parts": [
          {
            "kind": "text",
            "text": "{\"conditionScore\": 9, \"features\": [...], \"defects\": [], ...}"
          }
        ]
      }
    ]
  },
  "id": 1
}
```

---

### Underwriter Agent

```bash
cd underwriter
npm test
```

**Manual Test (JSON-RPC):**
```bash
curl -X POST http://localhost:4021 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "params": {
      "data": {
        "income": 95000,
        "debts": 2500,
        "creditScore": 720,
        "propertyPrice": 350000,
        "propertyCondition": "Excellent condition, no defects"
      }
    },
    "id": 2
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": { "state": "completed" },
    "artifacts": [
      {
        "parts": [
          {
            "text": "{\"riskLevel\": \"Low\", \"dti\": 31.6, \"decision\": \"Approved\", \"regulationCited\": \"B3-6-02\"}"
          }
        ]
      }
    ]
  },
  "id": 2
}
```

**Assertions:**
- `dti` should be approximately 31.6 (not 0.316)
- `decision` should be "Approved"
- `regulationCited` should contain a valid Fannie Mae section (e.g., "B3-6-02")

---

### QA Agent

```bash
cd qa-agent
npm test
```

**Manual Test (JSON-RPC):**
```bash
curl -X POST http://localhost:4024 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "params": {
      "data": {
        "decisionPack": {
          "riskLevel": "Low",
          "dti": 31.6,
          "decision": "Approved",
          "explanation": "DTI is within limits",
          "regulationCited": "B3-6-02"
        }
      }
    },
    "id": 3
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "artifacts": [
      {
        "parts": [
          {
            "text": "{\"thoughtSignature\": \"...\", \"status\": \"PASSED\", \"feedback\": null}"
          }
        ]
      }
    ]
  },
  "id": 3
}
```

**Assertions:**
- `status` should be "PASSED" for valid decision
- `status` should be "FAILED" for missing regulation citation

---

## E2E Test

### Full Workflow Test

```bash
# Start all services first
./start-gemini-swarm.sh

# Run E2E test (if exists)
cd scripts
node test-e2e.js
```

**Manual E2E via Broker:**
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

**Expected:**
- Returns `sessionId`
- Poll `/api/gemini-wizard/:sessionId` for status
- Final response includes `vision`, `underwriter`, `qa` results

---

## Sample Payloads

### Good Property (Expect: APPROVED)

```json
{
  "borrower": {
    "income": 95000,
    "monthlyDebts": 2500,
    "creditScore": 720,
    "propertyPrice": 350000
  },
  "property": {
    "inputType": "demo",
    "videoUrl": "https://www.youtube.com/watch?v=pQrS_qTv3M0"
  }
}
```

### Bad Property (Expect: DENIED)

```json
{
  "borrower": {
    "income": 95000,
    "monthlyDebts": 2500,
    "creditScore": 720,
    "propertyPrice": 350000
  },
  "property": {
    "inputType": "demo",
    "videoUrl": "https://www.youtube.com/watch?v=xYj4_g75FKM"
  }
}
```

### High DTI (Expect: DENIED or REFER)

```json
{
  "borrower": {
    "income": 50000,
    "monthlyDebts": 3500,
    "creditScore": 720,
    "propertyPrice": 350000
  },
  "property": {
    "inputType": "demo",
    "videoUrl": "https://www.youtube.com/watch?v=pQrS_qTv3M0"
  }
}
```
*DTI = (3500 * 12) / 50000 = 84% — above 43% threshold*

---

## Frontend Test

## Frontend Test

1. Open http://localhost:5173/?demo=1 (or production URL)
2. Click **"Demo"** Mode button (if not already active)
3. Click "🏠 Modern Home" → 3 images should load
4. Click "Start Analysis" (**No Access Code required**)
5. Verify:
   - Processing pipeline shows 3 steps
   - Files API indicator (85k tokens) appears
   - Report tab shows APPROVED with DTI 31.6%
   - PDF download works


---

## Regression Checklist

Before submission, verify:

- [ ] All smoke tests pass
- [ ] DTI displays as percentage (31.6%, not 0.316)
- [ ] Sample images load from Unsplash
- [ ] Files API context meter shows in UI
- [ ] QA verification grid displays 5 checks
- [ ] PDF export includes embedded images
- [ ] Fallback models activate if Gemini 3 unavailable
