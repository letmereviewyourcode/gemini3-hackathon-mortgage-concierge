
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from broker/.env or root (broker preference)
dotenv.config({ path: path.resolve(__dirname, '../broker/.env') });

const CLIENT_ID = process.env.ZEEBE_CLIENT_ID;
const CLIENT_SECRET = process.env.ZEEBE_CLIENT_SECRET;
const CLUSTER_ID = process.env.ZEEBE_CLOUD_CLUSTER_ID;
const REGION = process.env.ZEEBE_CLOUD_REGION || 'ont-1';
const AUTH_URL = process.env.ZEEBE_AUTHORIZATION_SERVER_URL || 'https://login.cloud.camunda.io/oauth/token';

async function getOAuthToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('audience', 'operate.camunda.io'); // Note: Audience is operate!

    try {
        const response = await axios.post(AUTH_URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Authentication failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function checkIncidents(processInstanceKey) {
    if (!processInstanceKey) {
        console.error('Usage: node check-incidents.js <processInstanceKey>');
        process.exit(1);
    }

    const token = await getOAuthToken();
    const OPERATE_URL = `https://${REGION}.operate.camunda.io/${CLUSTER_ID}/v1`;

    console.log(`🔍 Checking Incidents for Process: ${processInstanceKey} on ${OPERATE_URL}...`);

    try {
        const response = await axios.post(`${OPERATE_URL}/incidents/search`, {
            filter: {
                processInstanceKey: processInstanceKey,
                state: 'ACTIVE'
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const incidents = response.data.items || [];
        if (incidents.length === 0) {
            console.log('✅ No active incidents found.');
        } else {
            console.log(`⚠️ Found ${incidents.length} active incidents:`);
            incidents.forEach(inc => {
                console.log(`\n🔴 Incident ${inc.key} (Type: ${inc.type})`);
                console.log(`   Element: ${inc.flowNodeId}`);
                console.log(`   Message: ${inc.errorMessage}`);
                console.log(`   Creation Time: ${inc.creationTime}`);
            });
        }

    } catch (error) {
        console.error('❌ Request failed:', error.response?.data || error.message);
    }
}

const args = process.argv.slice(2);
checkIncidents(args[0]);
