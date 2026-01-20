# Project Name
Gemini Mortgage Concierge

# Elevator Pitch
**From 30 Days to 30 Seconds**: An autonomous multi-agent swarm that uses **Gemini 3.0 Flash** to "see" property conditions and **Gemini 3.0 Pro (Files API)** to enforce 1M+ tokens of Fannie Mae regulations—automating mortgage underwriting with audit-grade precision.

# The Problem
Mortgage underwriting is the bottleneck of home buying. It takes **45 days** on average because humans must manually cross-reference blurry property photos with thousands of pages of changing regulations. It is slow, subjective, and prone to "stare-and-compare" errors.

# The Solution
We built a **High-Agency Swarm** that automates the entire "Concept to Commitment" lifecycle:

1.  **Visual Inspection (Gemini 3.0 Flash)**: Not just "captioning"—our agent analyzes raw image bytes to identify specific defects (mold, structural cracks, water damage) and assigns a specialized condition score (1-10) used in the underwriting formula.
2.  **Regulatory Compliance (Gemini 3.0 Pro + Files API)**: Instead of RAG chunks, we load the **entire Fannie Mae Selling Guide (~85k tokens)** into the context window. The agent "reads" the rulebook in real-time to calculate DTI, verify income, and validate the property condition against specific subsections (e.g., *B3-6-02*).
3.  **Autonomous Safety (Self-Correction)**: A dedicated **QA Agent** acts as an adversarial auditor. It blindly reviews the Underwriter's output against the raw evidence. If it detects a hallucination or math error, it rejects the decision and forces a retry loop—ensuring reliability without human intervention.

# Gemini 3 Features Showcased
*   **Multimodal Vision (Flash)**: Replaces human appraisers for initial condition assessment. We stream image data directly to the model for detailed defect detection.
*   **1M+ Context Window (Files API)**: Solves the "Regulatory Complexity" problem. By holding the full context, the model understands the *interplay* between rules (e.g., how "Repair Escrows" affect "LTV ratios")—something chunk-based RAG cannot do.
*   **System Instructions & JSON Schema**: We use strict schema enforcement to ensure every agent output is machine-readable, allowing seamless handoffs between the Vision, Underwriter, and QA agents.

# How to Try It (Judges)
We have deployed a live, production-grade demo on Google Cloud Run.
**Note**: To protect our API quota, the demo is gated. Use the access code provided below.

1.  **Launch Demo**: [https://gemini-frontend-231423721146.us-central1.run.app](https://gemini-frontend-231423721146.us-central1.run.app)
2.  **Access Code**: `GeminiJudge2026` (Enter when prompted)
3.  **Quick Run**: Click **"🏠 Modern Home"** -> **"Start Analysis"**.

# Tech Stack
*   **AI**: Gemini 3.0 Pro, Gemini 3.0 Flash, Google AI Files API
*   **Frontend**: React, Vite, TailwindCSS
*   **Backend**: Node.js, TypeScript, Express
*   **Orchestration**: Custom Agentic Broker
*   **Infrastructure**: Google Cloud Run, Secret Manager

# Impact
*   **Speed**: Reduces underwriting time by 99.9%.
*   **Accuracy**: "read the manual" approach reduces compliance errors.
*   **Transparency**: Every decision includes citations and visual evidence, demystifying the "Black Box" of lending.
