const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

async function checkToken(name, id, secret) {
    if (!id || !secret) {
        console.log(`❌ ${name}: Missing ID/Secret`);
        return;
    }
    console.log(`🔍 Checking ${name} (${id.substring(0, 6)}...)...`);
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', id);
        params.append('client_secret', secret);
        params.append('audience', 'zeebe.camunda.io');

        const res = await axios.post('https://login.cloud.camunda.io/oauth/token', params);
        const token = res.data.access_token;
        const parts = token.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        console.log(`   ✅ Scope: ${payload.scope}`);
        const clusterMatches = payload.scope.includes('792e33ba'); // 8.9 Cluster ID
        console.log(`   🎯 Grants 8.9 Access? ${clusterMatches ? 'YES!!!' : 'No'}`);

    } catch (e) {
        console.log(`   ❌ Auth Failed: ${e.response?.data?.error || e.message}`);
    }
}

async function run() {
    // 1. PNNBn (Broker Env)
    try {
        const brokerEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, 'broker/.env')));
        await checkToken('Broker.env (PNNBn)', brokerEnv.ZEEBE_CLIENT_ID, brokerEnv.ZEEBE_CLIENT_SECRET);
    } catch (e) { console.log('Skipped Broker check'); }

    // 2. X7d5 (Chat App Env)
    try {
        const chatEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../AI Agent Chat Simple/backend/.env')));
        await checkToken('Chat.env (X7d5)', chatEnv.ZEEBE_CLIENT_ID, chatEnv.ZEEBE_CLIENT_SECRET);
    } catch (e) { console.log('Skipped Chat check'); }

    // 3. XVuw (Cluster 88 File)
    // Hardcoded from file content I read earlier
    const C88 = {
        ID: 'XVuwLdGql1Gk-yWIznIsYjhBrw.tC5c.',
        SECRET: 'XnDkSI.fo4P_h2_0cqfAuVWAi.uUJ8Rkyh~rizF.3i~Z9_C4qb4ueAHAD6LY8Bv1'
    };
    await checkToken('Cluster88 File (XVuw)', C88.ID, C88.SECRET);
}

run();
