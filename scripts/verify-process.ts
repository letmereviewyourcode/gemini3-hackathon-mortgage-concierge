
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("✅ .env loaded");
} else {
    console.error("❌ .env file NOT found at", envPath);
}

const AUTH_URL = process.env.ZEEBE_AUTHORIZATION_SERVER_URL || 'https://login.cloud.camunda.io/oauth/token';
const CLIENT_ID = process.env.ZEEBE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ZEEBE_CLIENT_SECRET || '';
const CLUSTER_ID = process.env.ZEEBE_CLOUD_CLUSTER_ID || '';
const REGION = process.env.ZEEBE_CLOUD_REGION || 'ont-1';

// Use Operate API for historical data/variables
const OPERATE_BASE_URL = `https://${REGION}.operate.camunda.io/${CLUSTER_ID}`;
// Use Zeebe REST API for active instance variables (more direct if active)
const ZEEBE_REST_BASE_URL = `https://${REGION}.zeebe.camunda.io/${CLUSTER_ID}/v2`;

async function getOAuthToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('audience', 'operate.camunda.io'); // Scope for Operate
    // Note: For Zeebe REST, audience is zeebe.camunda.io. Let's try Zeebe REST first as it's active.

    try {
        const response = await axios.post(AUTH_URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error: any) {
        console.error('Failed to get token:', error.response?.data || error.message);
        process.exit(1);
    }
}

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
    } catch (error: any) {
        console.error('Failed to get Zeebe token:', error.response?.data || error.message);
        throw error;
    }
}

async function checkVariables(processInstanceKey: string) {
    console.log(`🔍 Checking variables for Process Instance: ${processInstanceKey}`);
    const token = await getZeebeToken();

    try {
        // Search variables
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

        const keyVars = [
            'riskDecision',
            'creditResult',
            'propertyResult',
            'incomeResult',
            'complianceResult',
            'rateResult',
            'underwriterResult'
        ];

        const found: any = {};
        items.forEach((v: any) => {
            if (keyVars.includes(v.name)) {
                // Try to parse if it calls it a string
                try {
                    found[v.name] = JSON.parse(v.value);
                } catch {
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

    } catch (error: any) {
        console.error('❌ Failed to fetch variables:', error.response?.data || error.message);
    }
}

// CLI Arg
const pid = process.argv[2];
if (!pid) {
    console.error("Please provide processInstanceKey");
} else {
    checkVariables(pid);
}
