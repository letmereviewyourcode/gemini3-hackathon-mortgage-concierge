
import { C8 } from 'camunda-8-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('🔧 Configuring Camunda 8 SDK environment...');

// Polyfill Environment Variables for SDK from C8_89 or ZEEBE prefixes
const clusterId = process.env.ZEEBE_CLOUD_CLUSTER_ID || process.env.C8_89_CAMUNDA_CLUSTER_ID;
const region = process.env.ZEEBE_CLOUD_REGION || process.env.C8_89_CAMUNDA_CLUSTER_REGION || 'ont-1';

// Ensure standard ZEEBE_ vars are set if missing but C8_89_ vars exist
if (!process.env.ZEEBE_ADDRESS && clusterId) {
    process.env.ZEEBE_ADDRESS = `${clusterId}.${region}.zeebe.camunda.io:443`;
}
if (!process.env.ZEEBE_CLIENT_ID) process.env.ZEEBE_CLIENT_ID = process.env.C8_89_ZEEBE_CLIENT_ID;
if (!process.env.ZEEBE_CLIENT_SECRET) process.env.ZEEBE_CLIENT_SECRET = process.env.C8_89_ZEEBE_CLIENT_SECRET;
if (!process.env.ZEEBE_AUTHORIZATION_SERVER_URL) process.env.ZEEBE_AUTHORIZATION_SERVER_URL = process.env.C8_89_ZEEBE_AUTHORIZATION_SERVER_URL || 'https://login.cloud.camunda.io/oauth/token';

console.log(`   Cluster ID: ${clusterId}`);
console.log(`   Region: ${region}`);
console.log(`   ClientId: ${process.env.ZEEBE_CLIENT_ID ? 'Set' : 'Missing'}`);

async function deploy() {
    console.log('🚀 Deploying BPMN to Camunda 8 via SDK (ZBClient)...');

    const zbc = new C8.ZBClient();

    try {
        const topology = await zbc.topology();
        console.log('✅ Connected to cluster:', topology.gatewayVersion);

        const result = await zbc.deployProcess('./bpmn/mortgage-concierge-wizard-e2e.bpmn');

        console.log('✅ Deployment Successful!');
        console.log('Key:', result.key);
        console.log('Workflows:', result.workflows.map(w => `${w.bpmnProcessId} v${w.version}`).join(', '));

        // Wait a moment for deployment to propagate
        await new Promise(r => setTimeout(r, 2000));

    } catch (e) {
        console.error('❌ Deployment Failed:', e);
        process.exit(1);
    }
}

deploy();
