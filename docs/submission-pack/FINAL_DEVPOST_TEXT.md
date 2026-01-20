# Project Name
Gemini Mortgage Concierge

# Elevator Pitch
**The multi-day manual Mortgage Property Review Problem, Solved in 45 Seconds.** 
An autonomous multi-agent swarm that uses **Gemini 3.0 Flash** to "see" real property conditions and **Gemini 3.0 Pro** to read the entire Fannie Mae rulebook—automating underwriting with audit-grade precision.

# The Problem
Applying for a home loan is the most stressful financial event in a person's life. It sometimes takes **10-15 days** to inspect basic aspects like income eligibility, and property issues because humans must manually cross-reference thousands of blurry photos with 1,200 pages of ever-changing federal regulations. It is slow, subjective, and prone to costly "stare-and-compare" errors.

# The Solution
We built a **High-Agency Swarm** that automates the entire "Concept to Commitment" lifecycle:

1.  **Visual Inspection (Gemini 3.0 Flash)**: Not just "captioning"—our agent analyzes raw image bytes to identify specific defects (mold, structural cracks, water damage) and assigns a specialized condition score (1-10) used in the underwriting formula.
2.  **Regulatory Compliance (Gemini 3.0 Pro + Files API)**: Instead of unreliable RAG chunks, we load the **entire Fannie Mae Selling Guide (~85k tokens)** into the context window. The agent *reads* the rulebook in real-time to calculate DTI, verify income, and validate the property condition against specific regulation codes (e.g., *B3-6-02*)—just like a human underwriter, but instantly.
3.  **Autonomous Safety (Self-Correction)**: A dedicated **QA Agent** acts as an adversarial auditor. It blindly reviews the Underwriter's output against the raw evidence. If it detects a hallucination or math error, it rejects the decision and forces a retry loop—ensuring 100% reliability.

# Gemini 3 Features Showcased
*   **Multimodal Native Vision**: We stream raw image bytes directly to Gemini 3.0 Flash. It doesn't just describe a "house"—it spots the water stain on the ceiling that kills the deal.
*   **1M+ Token Context (Files API)**: We solved the "Regulatory Complexity" problem. By holding the full context, the model understands the *interplay* between rules (e.g., how "Repair Escrows" affect "LTV ratios")—something chunk-based RAG simply cannot do.
*   **Structured Agency**: We use strict JSON Schema enforcement for every agent, creating a deterministic "Production Line" where intelligent agents hand off audit-ready artifacts.

# How to Try It (Judges)
We have deployed a live, production-grade demo on Google Cloud Run.
**Note**: To protect our API quota, the demo is gated. 

1.  **Launch Demo**: [https://gemini-frontend-231423721146.us-central1.run.app](https://gemini-frontend-231423721146.us-central1.run.app)
2.  **Enter Access Code**: (available in Devpost for Judges)
3.  **Quick Run**: Click **"🏠 Modern Home"** -> **"Start Analysis"**.

# Tech Stack
*   **AI**: Gemini 3.0 Pro, Gemini 3.0 Flash, Google AI Files API
*   **Frontend**: React, Vite, TailwindCSS (Glassmorphism UI)
*   **Backend**: Node.js, TypeScript, Express (Cloud Run)
*   **Orchestration**: Custom Agentic Broker with JSON-RPC Contracts
*   **Infrastructure**: Google Cloud Run, Secret Manager, Docker

# Impact
*   **Speed**: Reduces underwriting time by 99.9%.
*   **Accuracy**: "Read the manual" approach reduces compliance errors to near-zero.
*   **Transparency**: Every decision includes citations and visual evidence, demystifying the "Black Box" of lending.

# Challenges We Ran Into
*   **Context Window Latency**: Loading 85k tokens took 40s initially. We optimized by caching the `fileUri` instad of re-uploading, cutting it to <5s.
*   **Multimodal Hallucinations**: Vision models sometimes "invented" damage. We fixed this by adding the adversarial QA Agent that explicitly checks the Vision Agent's confidence scores.
*   **Prompt Engineering JSON**: Getting Gemini to output strictly valid JSON for the frontend state machine required 40+ iterations of system instructions.

# Data Sources & Licensing
*   **Fannie Mae Selling Guide**: We use the publicly available [Fannie Mae Single Family Selling Guide](https://selling-guide.fanniemae.com/) to demonstrate the 1M+ token context capability. This content is used strictly for demonstration purposes.
*   **Images**: All property photos used in the demo scenarios are sourced from **Unsplash** (Free for commercial use license).
