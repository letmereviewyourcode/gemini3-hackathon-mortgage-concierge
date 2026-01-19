import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as dotenv from 'dotenv';

// Load environment variables (check multiple paths)
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = process.env.PORT || process.env.UNDERWRITER_PORT || 4001;

// Initialize Gemini 3
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ FATAL: GEMINI_API_KEY not found in process.env");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Verified: Gemini 3.0 Pro Preview (Agentic & Reasoning)
const TARGET_MODEL = "gemini-3.0-pro-preview";
const FALLBACK_MODEL = "gemini-2.0-flash-exp"; // or "gemini-1.5-pro"

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

// --- FILE API: UPLOAD REGULATION PACK ---
let regulationFileUri: string | null = null;
let regulationFileMetadata: any = null;

async function uploadRegulations() {
    try {
        const filePath = path.join(process.cwd(), 'regulations.txt');
        if (!fs.existsSync(filePath)) {
            console.warn("⚠️ regulations.txt not found. Skipping file upload.");
            return;
        }

        const fileStats = fs.statSync(filePath);
        console.log("📤 Uploading Regulation Pack to Gemini Files API...");
        const uploadResponse = await fileManager.uploadFile(filePath, {
            mimeType: "text/plain",
            displayName: "Fannie Mae Regulation Pack"
        });

        regulationFileUri = uploadResponse.file.uri;
        regulationFileMetadata = {
            displayName: uploadResponse.file.displayName || 'Fannie Mae Regulation Pack',
            mimeType: 'text/plain',
            sizeBytes: fileStats.size,
            fileUri: regulationFileUri,
            uploadedAt: new Date().toISOString()
        };
        console.log(`✅ Regulations Uploaded: ${regulationFileUri} (${fileStats.size} bytes)`);
    } catch (e: any) {
        console.error("❌ Failed to upload regulations:", e.message);
    }
}

// Upload on startup
uploadRegulations();

app.use((req, res, next) => {
    console.log(`📨 [Underwriter-Gemini] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// 1. Agent Card
app.get('/.well-known/agent-card.json', (req, res) => {
    const cardPath = path.join(process.cwd(), 'agent-card.json');
    const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
    card.url = publicUrl;
    res.json(card);
});

// 2. Main A2A Handler
app.post('/', async (req, res) => {
    console.log('🤖 [Underwriter] JSON-RPC Request:', JSON.stringify(req.body, null, 2).substring(0, 500));

    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
        return res.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id });
    }

    if (method === 'agent/authenticatedExtendedCard') {
        const cardPath = path.join(process.cwd(), 'agent-card.json');
        const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
        card.url = publicUrl;
        return res.json({ jsonrpc: '2.0', result: card, id });
    }

    if (method === 'tasks/send' || method === 'message/send') {
        const { message, skillId, contextId } = params || {};

        let textContent = '';
        if (message?.parts) {
            for (const part of message.parts) {
                if (part.text) textContent += part.text;
            }
        }

        let income = params?.data?.income || 0;
        let debts = params?.data?.debts || 0;
        let creditScore = params?.data?.creditScore || 0;

        if (!income) {
            const incomeMatch = textContent.match(/income[:\s]*\$?([\d,]+)/i);
            if (incomeMatch) income = parseInt(incomeMatch[1].replace(/,/g, ''));
        }

        console.log(`📊 [Underwriter] Analyzing via Gemini 3 Pro (Files API): Income=$${income}, Debts=$${debts}`);

        try {
            const propertyCondition = params?.data?.propertyCondition || textContent;
            const propertyPrice = params?.data?.propertyPrice || 0;

            const promptParts: any[] = [
                {
                    text: `TASK: You are a strict Mortgage Underwriter Agent using Gemini 3 reasoning.
Analyze the financial data below against the Fannie Mae Regulations provided in the attached file.

1. Calculate DTI as a PERCENTAGE (e.g., if monthly debts are $2500 and annual income is $95000, DTI = (2500*12)/95000*100 = 31.6%).
2. Consider the property condition score. Properties with score <= 4 should be DENIED due to habitability concerns.
3. Cite specific regulations (e.g. B3-6-02) for your decision. 
4. Return JSON ONLY: { "riskLevel": "Low"|"Medium"|"High", "dti": number (AS PERCENTAGE, e.g. 31.6 NOT 0.316), "decision": "Approved"|"Denied"|"Refer", "explanation": "string", "regulationCited": "string" }

DATA:
Annual Income: $${income}
Monthly Debts: $${debts}
Credit Score: ${creditScore}
Property Price: $${propertyPrice}
Property Condition: ${propertyCondition}
User Notes: ${textContent}`
                }
            ];

            if (regulationFileUri) {
                promptParts.unshift({
                    fileData: { mimeType: "text/plain", fileUri: regulationFileUri }
                });
            } else {
                console.warn("⚠️ No regulation file URI available. Using fallback.");
            }

            const startTime = Date.now();
            const activeModel = await getModel();

            // Count tokens for context proof
            let tokenCount = 0;
            try {
                const countResult = await activeModel.countTokens(promptParts);
                tokenCount = countResult.totalTokens;
                console.log(`📊 [Context Proof] Prompt tokens: ${tokenCount}`);
            } catch (e) {
                console.log('📊 [Context Proof] Token counting unavailable');
            }

            const result = await activeModel.generateContent(promptParts);
            const response = result.response;
            const initialReply = response.text();
            const initialProcessingTime = Date.now() - startTime;

            console.log(`✅ [Underwriter] Initial Analysis complete in ${initialProcessingTime}ms. Starting QA Loop...`);

            // --- AUTONOMOUS VERIFICATION LOOP WITH BOUNDED RETRY ---
            const MAX_RETRIES = 2;
            let retryCount = 0;
            let finalReply = initialReply;
            let qaVerdict: any = { status: 'SKIPPED', feedback: null, thoughtSignature: null };

            try {
                const cleanJson = initialReply.replace(/```json/g, '').replace(/```/g, '').trim();
                let decisionParams = JSON.parse(cleanJson);

                while (retryCount < MAX_RETRIES) {
                    console.log(`🔄 [QA Loop] Attempt ${retryCount + 1}/${MAX_RETRIES}`);

                    const qaResponse = await axios.post(`http://localhost:${process.env.QA_PORT || 4024}`, {
                        jsonrpc: '2.0',
                        method: 'tasks/send',
                        params: { data: { decisionPack: decisionParams } },
                        id: Date.now()
                    });

                    const qaResult = qaResponse.data.result?.artifacts?.[0]?.parts?.[0]?.text;
                    if (qaResult) {
                        const qaJson = JSON.parse(qaResult.replace(/```json/g, '').replace(/```/g, '').trim());
                        qaVerdict = {
                            status: qaJson.status,
                            feedback: qaJson.feedback || null,
                            thoughtSignature: qaJson.thoughtSignature || null,
                            attempt: retryCount + 1
                        };
                        console.log(`🛡️ [QA Verification] Status: ${qaJson.status}`);

                        if (qaJson.status === 'PASSED') {
                            console.log('✅ [QA PASSED] Decision verified.');
                            break;
                        }

                        if (qaJson.status === 'FAILED' && retryCount < MAX_RETRIES - 1) {
                            console.warn(`⚠️ [QA FAILED] Retry ${retryCount + 1}/${MAX_RETRIES}: ${qaJson.feedback}`);

                            const fixParts = [...promptParts, { text: `\n\nQA FEEDBACK (Retry ${retryCount + 1}):\n"${qaJson.feedback}"\n\nPREVIOUS ATTEMPT:\n${finalReply}\n\nTASK: Fix the decision and return corrected JSON.` }];
                            const fixModel = await getModel();
                            const fixResult = await fixModel.generateContent(fixParts);
                            finalReply = fixResult.response.text();

                            const fixedClean = finalReply.replace(/```json/g, '').replace(/```/g, '').trim();
                            decisionParams = JSON.parse(fixedClean);
                            console.log(`✅ [Auto-Fix] Retry ${retryCount + 1} generated.`);
                        }
                    }
                    retryCount++;
                }
            } catch (qaError: any) {
                console.error("⚠️ QA Loop Failed (skipping):", qaError.message);
                qaVerdict = { status: 'ERROR', feedback: qaError.message };
            }

            const totalProcessingTime = Date.now() - startTime;

            let resultPayload;
            if (method === 'message/send') {
                resultPayload = {
                    kind: 'message',
                    role: 'agent',
                    messageId: (id || Date.now()).toString(),
                    contextId: contextId || (id || Date.now()).toString(),
                    parts: [{ kind: 'text', text: finalReply }]
                };
            } else {
                // Parse final decision for enhanced response
                let parsedDecision = {};
                try {
                    parsedDecision = JSON.parse(finalReply.replace(/```json/g, '').replace(/```/g, '').trim());
                } catch { parsedDecision = { raw: finalReply }; }

                resultPayload = {
                    id: id || Date.now().toString(),
                    status: { state: 'completed' },
                    artifacts: [{ parts: [{ kind: 'text', text: finalReply }] }],
                    metadata: {
                        processingTimeMs: totalProcessingTime,
                        tokenCount: tokenCount,
                        filesApiUsed: !!regulationFileUri,
                        filesApiMetadata: regulationFileMetadata,
                        qaVerdict: qaVerdict,
                        model: TARGET_MODEL,
                        retryCount: retryCount
                    }
                };
            }

            return res.json({ jsonrpc: '2.0', result: resultPayload, id });

        } catch (e: any) {
            console.error("❌ Gemini error:", e.message);
            return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
        }
    }
});

const generateLLMResponse = async (systemPrompt: string, userContext: string) => {
    try {
        const prompt = `${systemPrompt}\n\nINPUT CONTEXT:\n${userContext}`;
        const activeModel = await getModel();
        const result = await activeModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (e) {
        console.error("Gemini LLM Error:", e);
        return { error: "Failed to generate data" };
    }
};

// MOCK AGENTS
const AGENTS: any = {
    'property-valuation': { name: 'Property Valuation', op: 'GetPropertyValue', prompt: "Estimate value. JSON: { estimatedValue: number, marketTrends: string }" },
    'credit-bureau': { name: 'Credit Bureau', op: 'CheckCreditReport', prompt: "Generate credit report. JSON: { score: number, history: string }" },
    'income-verification': { name: 'Income Verification', op: 'VerifyIncome', prompt: "Verify income. JSON: { verified: boolean, annualIncome: number }" },
    'compliance-check': { name: 'Compliance Check', op: 'CheckCompliance', prompt: "Check compliance. JSON: { compliant: boolean, flags: string[] }" },
    'rate-comparison': { name: 'Rate Comparison', op: 'GetMarketRates', prompt: "Get rates. JSON: { rates: [] }" },
    'property-verifier': { name: 'Property Verifier', op: 'VerifyProperty', prompt: "Verify property details. JSON: { matches: boolean }" }
};

Object.keys(AGENTS).forEach(key => {
    const agent = AGENTS[key];
    const router = express.Router();

    router.get('/.well-known/agent-card.json', (req, res) => {
        res.json({
            name: agent.name,
            description: `Gemini Agent for ${agent.name}`,
            skills: [{ id: agent.op, name: agent.op, description: agent.name, inputModes: ["application/json"], outputModes: ["application/json"] }],
            url: `${publicUrl}/mock/${key}`
        });
    });

    router.post('/', async (req, res) => {
        const { method, params, id } = req.body;
        if (method === 'agent/authenticatedExtendedCard') return res.json({ jsonrpc: '2.0', id, result: { url: `${publicUrl}/mock/${key}` } });
        if (method === 'tasks/send' || method === 'message/send') {
            const result = await generateLLMResponse(agent.prompt, JSON.stringify(params?.data));
            return res.json({
                jsonrpc: '2.0', id,
                result: { status: { state: 'completed' }, artifacts: [{ parts: [{ kind: 'text', text: JSON.stringify(result) }] }] }
            });
        }
        res.status(404).send();
    });
    app.use(`/mock/${key}`, router);
});

app.listen(PORT, () => {
    console.log(`🏦 Underwriter Agent (Gemini 3 + QA Loop) listening on port ${PORT}`);
    try {
        const sharedFile = path.resolve(process.cwd(), '../public-urls.json');
        if (fs.existsSync(sharedFile)) {
            const urls = JSON.parse(fs.readFileSync(sharedFile, 'utf-8'));
            if (urls.underwriterUrl) publicUrl = urls.underwriterUrl;
        }
    } catch (e) { }
    console.log(`   - Public URL: ${publicUrl}`);
});
