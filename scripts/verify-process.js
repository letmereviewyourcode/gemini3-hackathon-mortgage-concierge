const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error("Error loading .env:", result.error);
    } else {
        console.log("✅ .env loaded. Parsed keys:", Object.keys(result.parsed));
    }
} else {
    console.error("❌ .env file NOT found at", envPath);
    // Fallback: Try current directory
    const localEnv = path.resolve(__dirname, '.env');
    if (fs.existsSync(localEnv)) {
        console.log("Found .env in current dir, loading...");
        dotenv.config({ path: localEnv });
    }
}

if (!process.env.ZEEBE_CLIENT_ID) {
    console.error("❌ ZEEBE_CLIENT_ID is missing!");
    process.exit(1);
}

const AUTH_URL = process.env.ZEEBE_AUTHORIZATION_SERVER_URL || 'https://login.cloud.camunda.io/oauth/token';
const CLIENT_ID = process.env.ZEEBE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ZEEBE_CLIENT_SECRET || '';
const CLUSTER_ID = process.env.ZEEBE_CLOUD_CLUSTER_ID || '';
const REGION = process.env.ZEEBE_CLOUD_REGION || 'ont-1';

const ZEEBE_REST_BASE_URL = `https://${REGION}.zeebe.camunda.io/${CLUSTER_ID}/v2`;

async function getZeebeToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('audience', 'zeebe.camunda.io');

    try {
        const response = await axios.post(AUTH_URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Failed to get token:', error.response?.data || error.message);
        throw error;
    }
}

async function checkIncidents(processInstanceKey, token) {
    try {
        const response = await axios.post(`${ZEEBE_REST_BASE_URL}/incidents/search`, {
            filter: { processInstanceKey }
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const items = response.data.items || [];
        if (items.length > 0) {
            console.error("\n❌ INCIDENTS FOUND:");
            items.forEach(inc => {
                console.error(`- Type: ${inc.errorType} | msg: ${inc.errorMessage} | Job: ${inc.jobKey}`);
            });
        } else {
            console.log("\n✅ No active incidents found.");
        }
    } catch (e) {
        console.warn("Could not check incidents (v2 API might vary):", e.message);
    }
}

async function checkVariables(processInstanceKey) {
    console.log(`🔍 Checking Process Instance: ${processInstanceKey}`);
    const token = await getZeebeToken();

    await checkIncidents(processInstanceKey, token);

    try {
        const response = await axios.post(`${ZEEBE_REST_BASE_URL}/variables/search`, {
            filter: { processInstanceKey }
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const items = response.data.items || [];
        console.log(`✅ Found ${items.length} variables.`);
        const foundNames = items.map(i => i.name);
        console.log("Variablenames found:", foundNames.join(", "));

        // Log URL values specifically to debug null issues
        const urlVars = foundNames.filter(n => n.endsWith('Url'));
        console.log("\n--- URL VARIABLES ---");
        urlVars.forEach(key => {
            const v = items.find(i => i.name === key);
            console.log(`${key}: ${v.value}`);
        });

        const keyVars = [
            'riskDecision',
            'creditResult',
            'propertyResult',
            'incomeResult',
            'complianceResult',
            'rateResult',
            'underwriterResult'
        ];

        const found = {};
        items.forEach(v => {
            if (keyVars.includes(v.name)) {
                try {
                    found[v.name] = JSON.parse(v.value);
                } catch (e) {
                    found[v.name] = v.value;
                }
            }
        });

        console.log("--- AGENT RESULTS ---");
        console.log(JSON.stringify(found, null, 2));

        if (Object.keys(found).length >= 5) {
            console.log("🚀 SUCCESS: Most agents have reported back!");
        } else {
            console.log("⚠️ WARNING: Some agents missing.");
        }

    } catch (error) {
        console.error('❌ Failed to fetch variables:', error.response?.data || error.message);
    }
}

const pid = process.argv[2];
if (!pid) {
    console.error("Please provide processInstanceKey");
} else {
    checkVariables(pid);
}
