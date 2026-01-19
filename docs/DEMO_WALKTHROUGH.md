# Gemini Mortgage Concierge — Demo Script 🏆

> **For Hackathon Judges** | Total Demo Time: ~3 minutes

---

## 🚀 One-Command Setup

```bash
cd mortgage-concierge-gemini && ./start-gemini-swarm.sh
# Open: http://localhost:8100/projects/gemini-mortgage
```

---

## 📋 Demo Script

### Part 1: Introduction (30 sec)

**Say:** "This is the Gemini Mortgage Concierge — a multi-agent swarm for mortgage pre-qualification."

**Point out the header:**
- "Gemini 3.0 Multi-Agent Swarm" badge
- "Real multimodal analysis" subtitle

---

### Part 2: Borrower Input (Already Pre-filled)

| Field | Value | Narration |
|-------|-------|-----------|
| Name | Alice Chen | "Our borrower, Alice, a first-time homebuyer" |
| Income | $95,000 | "Solid annual income" |
| Monthly Debts | $2,500 | "Car payment, student loans, credit cards" |
| Credit Score | 720 | "Good credit" |
| Property | $350,000 | "Looking at a starter home" |

**Say:** "Notice the DTI auto-calculates to **31.6%** — below the 43% maximum threshold."

---

### Part 3: Load Sample Images (15 sec)

1. Click **"🏠 Modern Home"** sample button
2. Wait 3 seconds for 3 images to load
3. **Say:** "We're loading 3 property photos from Unsplash — this is real multimodal analysis."

---

### Part 4: Run Analysis (60 sec)

1. Click **"▶ Start Analysis"**
2. Watch the Processing Pipeline on the right:

**Step 1 — Inspect Property**
> "Property Vision Agent, powered by Gemini 3.0 Flash, is analyzing the actual image pixels — not metadata. It's identifying any defects: water damage, mold, structural issues."

**Step 2 — Underwrite + Files API** ⭐
> "This is the key differentiator. The Underwriter Agent loads the **entire Fannie Mae Selling Guide** — 500+ pages — into Gemini's **1M token context window** via the **Files API**. Watch the context meter — we're using about 85,000 tokens."

**Point out the blue Files API indicator:**
- Document: `selling-guide-2024.pdf`
- Tokens: `~85K`
- Context meter: `8.5% utilized`

**Step 3 — Verify Decision**
> "The QA Agent now **autonomously audits** the decision. If it finds calculation errors or hallucinated regulations, it automatically triggers re-analysis. This is self-correction without human intervention."

---

### Part 5: Review Report (60 sec)

When analysis completes, watch for auto-switch to Report tab.

**Highlight these elements:**

#### 1. Decision Banner
- ✅ **APPROVED** (green)
- DTI: **31.6%**
- Risk: **Low**

**Say:** "Clear approve/deny with explanation."

#### 2. Property Images Analyzed
**Say:** "All 3 photos we uploaded are displayed here — proof of what Gemini analyzed."

#### 3. Files API Context Window ⭐
**Point to this prominently:**
- "Files API — 1M Context Window"
- ~85K tokens used
- Fannie Mae Selling Guide loaded

**Say:** "This visual proves we're using the 1M context window. The entire regulation handbook is in context for precise citations."

#### 4. Property Vision Card
- Condition Score: **9/10**
- "No significant defects detected"

**Say:** "Gemini Flash actually inspected the property."

#### 5. Regulation Analysis
- Cited regulation: **B3-6-02**
- Credit/DTI/LTV checks

**Say:** "Real regulation citations — B3-6-02 is the actual Fannie Mae section for DTI limits."

#### 6. QA Verification Grid
**Say:** "The QA Agent verified 5 checks: DTI, regulations, property score, credit, and hallucination detection."

---

### Part 6: PDF Export (15 sec)

1. Click **"Download PDF"**
2. Print dialog opens with embedded images

**Say:** "Professional PDF with all evidence — ready for loan officer review."

---

## 💬 Talking Points for Judges

### On Multimodal:
> "Property Vision doesn't just read EXIF metadata — Gemini Flash analyzes actual pixels. It can spot water stains on ceilings that forms would miss."

### On 1M Context:
> "Most chatbots use RAG to search documents. We load the **entire** regulation handbook into context. That's why we cite specific sections like B3-6-02 — the model has the full text."

### On Self-Correction:
> "The QA Agent is adversarial. If the Underwriter hallucinates a regulation number, QA catches it and triggers auto-fix. No human needed."

---

## 🛠️ Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| Images fail to load | Click another sample or use manual upload |
| Analysis stalls | Check terminal logs; restart agents |
| DTI wrong | Should be 31.6% for default inputs |

---

## 🎬 Alternative Scenarios

### Bad Property (DENIED)
1. Click **"🏚️ Needs Work"**
2. Run analysis
3. Expected: **DENIED** with low condition score

### Average Property (CONDITIONAL)
1. Click **"📦 Average"**
2. Run analysis
3. Expected: Score 5-7, may show conditions

---

## ✅ Submission Criteria Checklist

| Criterion | ✓ | Demonstration |
|-----------|---|---------------|
| Technical Execution | ✅ | Real multimodal, Files API, self-correction |
| Potential Impact | ✅ | 30 days → 30 seconds |
| Innovation | ✅ | Multi-agent swarm, visual context proof |
| Presentation | ✅ | PDF export, enhanced UI, context meters |
