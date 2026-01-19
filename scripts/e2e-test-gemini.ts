import axios from 'axios';

const PROXY_URL = 'http://localhost:4025';

async function runTest() {
    console.log("🚀 Starting Gemini Swarm E2E Test...");

    try {
        // 1. Property Vision Test (Mock Video)
        console.log("\n📷 Testing Property Vision Agent (4023 via Proxy)...");
        const visionRes = await axios.post(`${PROXY_URL}/property-vision/`, {
            jsonrpc: "2.0",
            method: "tasks/send",
            params: { data: { videoUrl: "https://www.youtube.com/watch?v=mock-video" } },
            id: 1
        });
        console.log("✅ Vision Response:", visionRes.data);

        // 2. Underwriter Test (With Files API)
        console.log("\n🏦 Testing Underwriter Agent (4021 via Proxy)...");
        const underwriterRes = await axios.post(`${PROXY_URL}/underwriter/`, {
            jsonrpc: "2.0",
            method: "tasks/send",
            params: {
                data: {
                    income: 120000,
                    debts: 3000,
                    creditScore: 740,
                    message: { parts: [{ text: "Property is in good condition." }] }
                }
            },
            id: 2
        });
        console.log("✅ Underwriter Response:", underwriterRes.data);

        // 3. QA Agent Test (Direct Check)
        console.log("\n🛡️ Testing QA Agent (4024 via Proxy)...");
        const qaRes = await axios.post(`${PROXY_URL}/qa/`, {
            jsonrpc: "2.0",
            method: "tasks/send",
            params: {
                data: {
                    decisionPack: {
                        riskLevel: "Low",
                        decision: "Approved",
                        explanation: "DTI is good.",
                        regulationCited: "B3-6-02"
                    }
                }
            },
            id: 3
        });
        console.log("✅ QA Response:", qaRes.data);

        console.log("\n🎉 E2E Test Complete: All Agents Active!");

    } catch (error: any) {
        console.error("❌ Test Failed:", error.message);
        if (error.response) {
            console.error("   Status:", error.response.status);
            console.error("   Data:", error.response.data);
        }
    }
}

runTest();
