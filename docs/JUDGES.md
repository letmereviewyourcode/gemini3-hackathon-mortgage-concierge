# 🧑‍⚖️ Judge's Guide: Gemini Mortgage Concierge

Thank you for reviewing our submission! This guide ensures you see the best of **Gemini 3.0** in action.

## 🚀 Live Demo Access

**Launch URL**: [https://gemini-frontend-231423721146.us-central1.run.app](https://gemini-frontend-231423721146.us-central1.run.app)

**Yes, you can run the full demo directly in your browser.** 

## 🔑 Access Control
To protect our API quota while keeping the demo public, we use a simple Access Code.
**Code**: `GeminiJudge2026`

*   **Why?** Typically we would implement OAuth, but for the hackathon, a shared key allows instant access without account creation.
*   **Rate Limits**: We enforce a **300 requests/day** cap. If you see a 429 error, please try again in 60 seconds (or DM us on Devpost).

---

## 🏎️ The "Happy Path" (60 Seconds)

Experience the full multi-agent swarm without typing a thing.

1.  **Enter Access Code**: When prompted/clicked on "Start Analysis".
2.  **Select Scenario**: Click **"🏠 Modern Home"** (under "Quick load sample scenarios").
    *   *Loads 3 high-res images of a pristine home.*
3.  **Click "Start Analysis"**:
    *   🚀 **Watch the Pipeline**: The UI updates in real-time as agents work.

### ✅ Verification Checklist (What to look for)

| Feature | Where to see it | Proof it's Real |
| :--- | :--- | :--- |
| **Multimodal Vision** | **"Property Vision"** Card | See the Condition Score (e.g., 9/10) matching the images. |
| **1M Context Window** | **"Files API"** Indicator | Look for `~85K tokens` used (Fannie Mae Guide loaded). |
| **Regulation Citations** | **"Underwriter"** Card | Specific regulation (e.g., `B3-6-02`) cited in the decision. |
| **Self-Correction** | **"QA Verification"** box | All checks pass (DTI, Credit, Hallucination). |

4.  **Finish**: Click **"Download PDF"** to see the generated professional report.

---

## 🏚️ The "Edge Case" (Optional)

Want to see Gemini detect issues?
1.  Click **"Start New Analysis"** (Top Right).
2.  Click **"Input"** tab.
3.  Select **"🏚️ Needs Work"** scenario.
4.  Click **"Start Analysis"**.
    *   **Result**: Vision Agent detects damage. Underwriter warns/denies based on "Property Condition" guidelines.

---

## 🆘 Troubleshooting

**"Rate Limit Exceeded"**?
*   We have a strict cap (3 analyses/minute per IP) to allow fair access. Please wait 60 seconds and try again.

**"Access Denied"**?
*   Double-check the code from Devpost. It is case-sensitive.

**Demo Down?**
*   Please watch our **3-minute walkthrough video** (linked in Devpost) which captures the exact same flow.

---

## 🆕 New Features (v2.1.0)

### Demo Mode (`?demo=1`)
Add `?demo=1` to the URL to enable **Demo Mode**:
- Built-in sample scenarios bypass access code
- Demo Mode banner displayed
- Perfect for quick demonstrations

### Persona Toggle (Loan Officer / Borrower)
Switch between views in the Report:
- **Loan Officer View**: Full technical details, DTI breakdown, regulation citations, QA verification
- **Borrower View**: Simplified friendly summary, approval status, next steps

### Proof Mode Toggle
Enable/disable detailed evidence display:
- Token Meter showing Files API context window usage
- Regulation citations with clickable details
- QA verification checklist

---

## 🛠️ For Developers: E2E Testing

We include automated E2E tests to verify the multi-agent pipeline.

**Backend E2E Tests** (API-level):
```bash
cd ops && npm install
GIT_SHA=$(git rev-parse --short HEAD) node e2e-backend.mjs https://gemini-broker-231423721146.us-central1.run.app
```

**Browser E2E Tests** (Playwright):
```bash
cd ops && npx playwright test
```

**Deployment** uses Cloud Run revisions with traffic splitting for safe rollouts.
