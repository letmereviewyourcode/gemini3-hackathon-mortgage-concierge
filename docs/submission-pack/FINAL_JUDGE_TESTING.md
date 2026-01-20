# 🧪 Final Judge Testing Instructions

## 🌐 Option 1: Hosted Demo (Recommended)
**Fastest way to verify.**

1.  **Open URL**: [https://gemini-frontend-231423721146.us-central1.run.app](https://gemini-frontend-231423721146.us-central1.run.app)
2.  **Authenticate**: Enter Code `GeminiJudge2026`.
3.  **Run Happy Path**:
    *   Select **"Input"** tab.
    *   Click **"🏠 Modern Home"**.
    *   Click **"Start Analysis"**.
    *   *Observe*: Green checks, high Condition Score, Approval.
4.  **Run Edge Case**:
    *   Click **"Start New Analysis"**.
    *   Select **"🏚️ Needs Work"**.
    *   Click **"Start Analysis"**.
    *   *Observe*: Vision detects defects. Underwriter warns/denies.

## 💻 Option 2: Local Run (For Technical Audit)
**If you want to view the code in action.**

1.  **Clone**: `git clone <repo_url>`
2.  **Setup**:
    ```bash
    cd gemini-mortgage-concierge
    cp .env.example .env
    # Add your GEMINI_API_KEY to .env
    ```
3.  **Start Swarm**:
    ```bash
    ./start-gemini-swarm.sh
    ```
4.  **Access**: `http://localhost:8100`

## ✅ Success Criteria Checklist
*   [ ] **Vision**: Did it identify the "Need of Repair" correctly in the Edge Case?
*   [ ] **Context**: Did the "Files API" usage indicator appear?
*   [ ] **Citations**: Did the final report cite specific Fannie Mae codes (e.g., B4-1.3)?
*   [ ] **PDF**: Did the "Download PDF" button work?
