# Cloud Hosting Guide — Gemini Mortgage Concierge

> **Target:** Google Cloud Run (Fully Managed)
> **Project:** gemini3-mortgage-concierge
> **Status:** ✅ Deployed & Operational

---

## 1. Live Endpoints

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend** | `https://gemini-frontend-231423721146.us-central1.run.app` | Main User Interface |
| **Broker** | `https://gemini-broker-231423721146.us-central1.run.app` | Orchestration Layer |
| **Underwriter** | `https://gemini-underwriter-231423721146.us-central1.run.app` | Risk Analysis Agent |
| **Vision** | `https://gemini-vision-231423721146.us-central1.run.app` | Multimodal Analysis Agent |
| **QA Agent** | `https://gemini-qa-231423721146.us-central1.run.app` | Quality Assurance Agent |

---

## 5. Security & Access Control (Hackathon Hardening)

To protect Gemini API quotas during the public review period, we implemented a lightweight security layer.

### A. Token Gate (Broker Middleware)
The `gemini-broker` service rejects all analysis requests without a valid `X-DEMO-ACCESS-CODE` header.
- **Implementation**: Middleware in `src/index.ts`.
- **Secret**: The code is stored in Google Secret Manager as `DEMO_ACCESS_TOKEN`.
- **Injection**: Injected into the container as an environment variable at runtime.

### B. Rate Limiting strategy
We enforce abuse prevention caps at the application layer (in-memory):
1.  **IP Rate Limit**: Max 20 requests/minute (General).
2.  **Analysis Cap**: Max 3 full analyses/minute per IP (Expensive operation).
3.  **Daily Quota**: Global cap of 300 analyses/day to prevent billing runaways.

### C. Scaling Limits (Cloud Run)
- **Max Instances**: `10` (Prevents infinite horizontal scaling).
- **Concurrency**: `80` (Standard).
- **Timeout**: `60s` (Analysis is fast, faster than default 300s).

---

## 2. Technical Learnings & Gotchas

During the deployment to Google Cloud Run, we encountered and resolved several specific architectural challenges using the `deploy/deploy.sh` pipeline.

### A. TypeScript Runtime: ESM vs CommonJS
**Issue:** The `gemini-underwriter` service initially failed with `ERR_UNKNOWN_FILE_EXTENSION` when running in the Docker container. This was a conflict between Node.js's native ESM handling (`"type": "module"`) and `ts-node` / `tsx` execution environments.
**Resolution:** We enforced a **CommonJS** architecture for stability in production:
- Removed `"type": "module"` from `package.json`.
- Configured `tsconfig.json` with `"module": "commonjs"`.
- Reverted the Docker execution command to standard `npm start` (invoking `ts-node`).
- **Learning:** For containerized Node.js microservices, sticking to CommonJS generally offers fewer "weird" configuration headaches than ESM unless you are fully committed to a build-step-only architecture.

### B. Port Binding Limits
**Issue:** The `gemini-broker` failed to start because it was listening on port `4020` (its default local port), while Cloud Run contractually requires services to listen on the environment variable `$PORT` (typically `8080`).
**Resolution:** Updated the entry point `src/index.ts`:
```typescript
const PORT = process.env.PORT || process.env.BROKER_PORT || 4020;
```
**Learning:** Never hardcode ports in cloud services. Always respect `process.env.PORT`.

### C. Build-Time Dependencies
**Issue:** The Frontend build failed because it was missing `axios` (which was installed locally but not in `package.json`) and specific `vite/client` types.
**Resolution:** Explicitly added missing dependencies to `package.json` and updated `tsconfig.json` to include `"types": ["vite/client"]`.
**Learning:** `npm ci` (Clean Install) is unforgiving. It reveals "phantom dependencies" that work on your machine but fail in clean environments.

### D. Broker Routing Mismatch (404 Error)
**Issue:** The Frontend was designed to call `/property-vision` and `/underwriter` directly on the proxy, but the Broker was implemented as a pure orchestrator with only `/api/gemini-wizard`. This caused **404 Not Found** errors during analysis.
**Resolution:** Added explicit proxy routes to `broker/src/index.ts` to forward requests to the respective agent services:
```typescript
// Proxy: Property Vision
app.post('/property-vision', async (req, res) => {
    const response = await axios.post(VISION_URL, req.body);
    res.json(response.data);
});
```
**Learning:** Ensure your API Gateway/Broker actually exposes the endpoints your frontend expects, especially when "un-bundling" a monolith into microservices.

### E. Frontend Runtime Configuration
**Issue:** React apps built with Vite are static. Environment variables (`VITE_BROKER_URL`) are baked in at **build time**. In Cloud Run, we need to inject the Broker URL at **runtime** because it's only known after deployment.
**Resolution:**
1.  **Index.html:** Added a placeholder script `<script>window._env_ = { VITE_BROKER_URL: "..." }</script>`.
2.  **Entrypoint:** Used a custom `entrypoint.sh` (or Nginx config) to replace this placeholder with real env vars on container startup.
3.  **Code:** Updated `GeminiMortgage.tsx` to favor `window._env_.VITE_BROKER_URL` over `import.meta.env`.
**Learning:** "Build once, deploy anywhere" requires separating configuration from code. Use runtime injection for dynamic backend URLs.

---

## 3. Local vs. Cloud: Key Differences

If you are developing locally and moving to the cloud, here are the critical differences in our setup:

| Feature | Local Development 💻 | Cloud Run Production ☁️ |
| :--- | :--- | :--- |
| **Secrets** | Loaded from `.env` files. | Injected via **Google Secret Manager** at runtime. |
| **Networking** | Services talk to `localhost:4xxx`. | Services talk to HTTPS URLs (`https://service-hash.run.app`). |
| **Discovery** | Hardcoded logic or `.env` overrides. | URLs are injected as env vars during `deploy.sh`. |
| **Runtime** | `ts-node-dev` (Hot Reload). | `ts-node` (Production) or compiled JS. |
| **File System** | Persists to disk (e.g. uploaded images). | **Ephemeral**. Files verify only in memory or need GCS. |
| **Logs** | Terminal / Console output. | **Cloud Logging** (Structured JSON). |

## 4. Architecture Deep Dive

For the curious, here is exactly how this "Agentic Swarm" operates in a cloud-native environment.

### A. The Compute Model: Serverless Containers (Cloud Run)
Unlike traditional VMs (EC2) or Kubernetes (GKE), **Cloud Run** is serverless.
1.  **Scale to Zero**: When no one is using the app, **0 containers** are running. You pay $0.
2.  **On-Demand Scaling**: When a request hits the Frontend URL, Google spins up a container in milliseconds.
3.  **Concurrency**: Each container handles multiple requests (concurrently), unlike AWS Lambda which is typically 1:1.

### B. The Service Mesh (Agent-to-Agent Communication)
We don't use a message queue (Kafka/RabbitMQ) for this PoC. Instead, we use **Synchronous HTTP/REST Direct Messaging**.
1.  **Frontend** sends a request to the **Broker**.
2.  **Broker** acts as the "Orchestrator". It holds the state of the session (in memory) and calls other agents.
3.  **Agents** (Vision, Underwriter) are independent microservices. They don't know about each other. They only respond to the Broker.
4.  **Files API**: The Underwriter doesn't just "read" the PDF. It uploads it to Google's specialized **Gemini Files API**, obtaining a URI. It then passes this URI to the model, allowing for massive context (1M+ tokens) cheaply and quickly.

### C. The Security Model
1.  **Identity (IAM)**:
    *   Normally, services should only talk to authorized callers.
    *   For this Hackathon, we used `--allow-unauthenticated` to make the UI publicly accessible easily.
    *   In a real enterprise scenario, `gemini-broker` would require an **OIDC Token** from the Frontend's service account.
2.  **Secrets Management**:
    *   We do **NOT** put API keys in code or Dockerfiles.
    *   We use **Google Secret Manager**.
    *   Cloud Run mounts the secret as an environment variable (`GEMINI_API_KEY`) only at runtime.

### D. Runtime Configuration (The "Build Once" Rule)
Modern DevOps requires that you build a Docker image **once** and deploy it to Dev, Staging, and Prod without rebuilding.
*   **Problem**: React (Vite) compiles variables like `VITE_BROKER_URL` into static HTML/JS.
*   **Solution**: We inject a `window._env_` object into `index.html` at runtime. The React code checks this global variable first. This allows the exact same Docker image to talk to `dev-broker` or `prod-broker` depending on where it launches.

### Architecture Diagram
```mermaid
graph TD
    User([User / Judge]) -- HTTPS --> CDN[Cloud CDN / Load Balancer]
    CDN --> Frontend[Frontend Service<br/>(React SPA)]
    
    subgraph "Google Cloud Run (Serverless Mesh)"
        Frontend -- JSON/REST --> Broker[Broker Service<br/>(Orchestrator)]
        
        Broker -- 1. Analyze --> Vision[Vision Agent<br/>(Gemini 3.0 Flash)]
        Broker -- 2. Risk Check --> Underwriter[Underwriter Agent<br/>(Gemini 3.0 Pro)]
        Broker -- 3. Audit --> QA[QA Agent<br/>(Gemini 3.0 Pro)]
    end
    
    subgraph "Google AI Infrastructure"
        Underwriter -- Upload PDF --> FilesAPI[Gemini Files API]
        Vision --> VertexAI[Vertex AI / Gemini API]
    end
```

---

## 4. Deployment Command

To redeploy the entire stack (or specific services), use the unified script in the export folder:

```bash
cd export/gemini-mortgage-concierge
./deploy/deploy.sh
```

This script automatically:
1. Builds Docker images using Cloud Build.
2. Pushes them to Artifact Registry.
3. Deploys to Cloud Run with correct secrets and inter-service URL injection.
