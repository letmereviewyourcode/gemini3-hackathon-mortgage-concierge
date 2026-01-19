import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load environment variables
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: rootEnvPath });

const app = express();
const PORT = process.env.PORT || process.env.QA_PORT || 4024;

// Initialize Gemini 3
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ FATAL: GEMINI_API_KEY not found in process.env");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
// Verified: Gemini 3.0 Pro Preview (Reasoning & Auditing)
const TARGET_MODEL = "gemini-3.0-pro-preview";
const FALLBACK_MODEL = "gemini-2.0-flash-exp";

async function getModel() {
    try {
        const model = genAI.getGenerativeModel({ model: TARGET_MODEL });
        await model.countTokens("Ping");
        console.log(`✅ Using ${TARGET_MODEL}`);
        return model;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`⚠️ ${TARGET_MODEL} unavailable (${message}). Falling back to ${FALLBACK_MODEL}`);
        return genAI.getGenerativeModel({ model: FALLBACK_MODEL });
    }
}

app.use(cors());
app.use(express.json());

let publicUrl = `http://localhost:${PORT}`;

app.use((req, res, next) => {
    console.log(`🛡️ [QA-Agent] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.get('/.well-known/agent-card.json', (req, res) => {
    const cardPath = path.join(process.cwd(), 'agent-card.json');
    const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
    card.url = publicUrl;
    res.json(card);
});

app.post('/', async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (method === 'agent/authenticatedExtendedCard') {
        const cardPath = path.join(process.cwd(), 'agent-card.json');
        const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
        card.url = publicUrl;
        return res.json({ jsonrpc: '2.0', result: card, id });
    }

    if (method === 'tasks/send' || method === 'message/send') {
        try {
            const data = params?.data || {};
            const decisionPack = data.decisionPack;

            if (!decisionPack) throw new Error("Missing 'decisionPack'");

            console.log(`🧐 [QA] Verifying Decision Pack:`, JSON.stringify(decisionPack, null, 2).substring(0, 200));

            // THOUGHT SIGNATURE PROMPT
            // We force the model to output a "thought trace" before the verdict.
            const prompt = `
            TASK: You are a Quality Assurance Auditor using Gemini 3.
            Review the Underwriter's decision below against strict compliance rules.

            RULES:
            1. Every decision must cite a specific Regulation ID (e.g. B3-X-XX).
            2. DTI calculation must be present.
            3. Explanation must be logical.

            INPUT DECISION:
            ${JSON.stringify(decisionPack)}

            OUTPUT FORMAT (JSON):
            {
                "thoughtSignature": "Step-by-step reasoning trace...",
                "status": "PASSED" | "FAILED",
                "feedback": "string (required if FAILED)",
                "correctedDecision": { ... } (optional, if you can fix it)
            }`;

            const activeModel = await getModel();
            const result = await activeModel.generateContent(prompt);
            const reply = result.response.text();

            console.log("✅ [QA] Verification Complete");

            let resultPayload;
            if (method === 'message/send') {
                resultPayload = {
                    kind: 'message',
                    role: 'agent',
                    messageId: (id || Date.now()).toString(),
                    contextId: (id || Date.now()).toString(),
                    parts: [{ kind: 'text', text: reply }]
                };
            } else {
                resultPayload = {
                    id: id || Date.now().toString(),
                    status: { state: 'completed' },
                    artifacts: [{ parts: [{ kind: 'text', text: reply }] }]
                };
            }

            return res.json({ jsonrpc: '2.0', result: resultPayload, id });
        } catch (e: any) {
            console.error("❌ QA Error:", e.message);
            return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
        }
    }
    res.status(404).send();
});

app.listen(PORT, () => {
    console.log(`🛡️ QA Agent (Gemini 3) listening on port ${PORT}`);
    try {
        const sharedFile = path.resolve(process.cwd(), '../../public-urls.json');
        if (fs.existsSync(sharedFile)) {
            const urls = JSON.parse(fs.readFileSync(sharedFile, 'utf-8'));
            const current = JSON.parse(JSON.stringify(urls));
            current.qaUrl = `${current.proxyUrl || 'http://localhost:4025'}/qa`; // Ideally proxy handles it
            // Actually, we need to update proxy-server to route /qa -> 4024
        }
    } catch (e) { }
});
