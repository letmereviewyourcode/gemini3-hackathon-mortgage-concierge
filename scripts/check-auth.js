import { C8 } from 'camunda-8-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('--- Config Check ---');
console.log('ZEEBE_CLIENT_ID:', process.env.ZEEBE_CLIENT_ID ? process.env.ZEEBE_CLIENT_ID.substring(0, 5) + '...' : 'MISSING');
console.log('ZEEBE_CLOUD_CLUSTER_ID:', process.env.ZEEBE_CLOUD_CLUSTER_ID);
console.log('ZEEBE_CLOUD_REGION:', process.env.ZEEBE_CLOUD_REGION);
console.log('--------------------');

async function test() {
    console.log('Attempting C8.ZBClient().topology()...');
    try {
        const zbc = new C8.ZBClient(); // Picks up env vars automatically
        const topology = await zbc.topology();
        console.log('✅ gRPC Success! Topology:', JSON.stringify(topology, null, 2));
    } catch (e) {
        console.error('❌ gRPC Failed:', e.message);
    }
}

test();
