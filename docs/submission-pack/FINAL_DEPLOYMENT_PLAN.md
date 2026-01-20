# ☁️ Cloud Architecture & Deployment Plan

**Status**: Deployed & Live
**Region**: `us-central1`
**Project**: `gemini3-mortgage-concierge`

## 1. Services Architecture

We use **Google Cloud Run** for serverless, improved scalability.

| Service | Docker Image | Env Vars | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | `gemini-frontend:latest` | `VITE_BROKER_URL` | React UI host |
| **Broker** | `gemini-broker:latest` | `VISION_URL`, `UNDERWRITER_URL`, `QA_URL`, `DEMO_ACCESS_TOKEN` | API Gateway + Gatekeeper |
| **Agents** | `gemini-vision`, `gemini-underwriter`, `gemini-qa` | `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY` | Specialized AI Workers |

## 2. Security Configuration

### Secrets Strategy (Google Secret Manager)
*   **GEMINI_API_KEY**: Mounted as volume or env var (currently env var for Hackathon speed).
*   **DEMO_ACCESS_TOKEN**: Injected into Broker. Prevents public abuse of paid models.

### Network Security
*   **Ingress**: `Allow All` (Hackathon Requirement for Judges).
*   **Permissions**: `Cloud Run Invoker` (Public).
*   **Rate Limiting**: Enforced at Application Layer (Broker) -> 10 req/min per IP.

## 3. Scaling & Limits

To control costs during judging:
*   **Min Instances**: `0` (Scale to zero when idle).
*   **Max Instances**: `10` (Prevent billing runaway).
*   **Concurrency**: `80` (Standard).
*   **CPU**: `1` | **Memory**: `512MiB` (Broker/Frontend), `1GiB` (Agents).

## 4. Rollback Plan

If the live demo fails:
1.  **Revert Traffic**: Use Cloud Run "Manage Traffic" to switch 100% back to `revision-green`.
2.  **Emergency Kill**: Disable "Public Access" on `gemini-broker` to stop all calls.
