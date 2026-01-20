# Gemini Mortgage Concierge 🏠

> **Gemini 3 AI Developer Competition** | January 2026

**[Launch Live Demo 🚀](https://gemini-frontend-231423721146.us-central1.run.app)** | **[Watch 3-min Video 🎥](<ADD_YOUTUBE_OR_VIMEO_LINK_HERE>)** | **[Read Submission Text 📄](docs/submission-pack/FINAL_DEVPOST_TEXT.md)**

![Status](https://img.shields.io/badge/Status-Live%20%26%20Secured-success?style=for-the-badge) ![Gemini](https://img.shields.io/badge/AI-Gemini%203.0-8E75B2?style=for-the-badge)

> [!IMPORTANT]
> **You can run this live.**
> To manage Gemini Pro/Flash usage costs, the live demo prompts for an access code before it starts analysis.
> **Judges:** the code is listed in our Devpost submission under **"Judge's Notes"** / **"Additional Info"**.
>
> **60-Second Test Drive**
> 1. Open: **[Launch Live Demo](https://gemini-frontend-231423721146.us-central1.run.app)**  
> 2. Click **"🏠 Modern Home"** under Quick Scenarios  
> 3. Click **"Start Analysis"**  
> 4. **When prompted**, enter: (available in Devpost)
>
> ![Enter Access Code](docs/images/access-modal-guide.png)
>
> 5. Watch the pipeline run end-to-end: **Property Vision → Underwriter (policy context + citations) → QA verification → Report + PDF**

---

## 🤖 Gemini 3.0 Integration

This is an orchestrated multi-agent workflow (not a single chat prompt). It uses different Gemini 3 models for different tasks:

1. **Gemini 3.0 Flash (Vision)**
   - Sends **raw image bytes** (via `inlineData`) for property photo analysis.
   - Produces a structured **1–10 condition score** plus visible-issue notes (e.g., stains, cracks, finish quality).

2. **Gemini 3.0 Pro (Files API / Policy Context)**
   - Loads a large policy document into context (e.g., **Fannie Mae Selling Guide ~85K tokens** in this demo).
   - Generates an underwriting decision and includes **section references** (e.g., *B3-6-02*) when explaining constraints like DTI.

3. **Verification Loop (QA Agent)**
   - Validates key checks (DTI math, consistency, and that cited sections are present in the decision text).
   - If it flags an issue, it triggers a re-check before the final report is shown.

---

## ✨ Features Sequence

| Feature | Implementation | Model |
|---------|----------------|-------|
| **Multimodal Vision** | Analyzes property image bytes via `inlineData` | Gemini 3.0 Flash |
| **Large Context Policy Reasoning** | Loads ~85K token policy doc via Files API (demo) | Gemini 3.0 Pro |
| **Verification Loop** | QA agent validates decision + citations and triggers auto-recheck | Gemini 3.0 Pro |

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
