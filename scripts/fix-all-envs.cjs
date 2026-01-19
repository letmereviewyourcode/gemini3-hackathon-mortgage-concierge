const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. Org API Credentials (Global)
const ORG_CONFIG = {
    CAMUNDA_CONSOLE_CLIENT_ID: 'W9X8JRMs_1gmajfl',
    CAMUNDA_CONSOLE_CLIENT_SECRET: 'om5_l6TK6nqSp--~ehnLK7PN5B794j9J',
    CAMUNDA_CONSOLE_BASE_URL: 'https://api.cloud.camunda.io',
    CAMUNDA_CONSOLE_OAUTH_AUDIENCE: 'api.cloud.camunda.io'
};

// 2. Cluster 8.8 Credentials (hardcoded from file)
const CLUSTER_88 = {
    ZEEBE_CLIENT_ID: 'XVuwLdGql1Gk-yWIznIsYjhBrw.tC5c.',
    ZEEBE_CLIENT_SECRET: 'XnDkSI.fo4P_h2_0cqfAuVWAi.uUJ8Rkyh~rizF.3i~Z9_C4qb4ueAHAD6LY8Bv1',
    ZEEBE_CLOUD_CLUSTER_ID: '9416b998-8dbd-4fb2-8096-ce1c2bf61688',
    ZEEBE_CLOUD_REGION: 'ont-1',
    ZEEBE_AUTHORIZATION_SERVER_URL: 'https://login.cloud.camunda.io/oauth/token'
};

// Helper: Update .env file
function updateEnvFile(filePath, additions) {
    let content = '';
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
    }

    Object.entries(additions).forEach(([key, val]) => {
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${val}`);
        } else {
            content += `\n${key}=${val}`;
        }
    });

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
}

// MAIN EXECUTION

// A. Fix AI Agent Chat Simple (Cluster 8.8)
const chatAppEnv = path.resolve(__dirname, '../AI Agent Chat Simple/backend/.env'); // Rel lookup
if (fs.existsSync(chatAppEnv)) {
    console.log('--- Updating AI Agent Chat Simple (Cluster 8.8) ---');
    updateEnvFile(chatAppEnv, { ...CLUSTER_88, ...ORG_CONFIG });
} else {
    console.warn(`⚠️ Skipped AI Chat App: ${chatAppEnv} not found`);
}

// B. Fix Mortgage Concierge (Cluster 8.9)
// We need to fetch the SECRET from broker/.env first because we don't have it hardcoded
const brokerEnvPath = path.resolve(__dirname, 'broker/.env');
const mortgageRootEnv = path.resolve(__dirname, '.env');

if (fs.existsSync(brokerEnvPath)) {
    console.log('--- Updating Mortgage Concierge (Cluster 8.9) ---');
    const brokerConfig = dotenv.parse(fs.readFileSync(brokerEnvPath));

    // Ensure broker/.env has the right ID (PNNBn)
    if (brokerConfig.ZEEBE_CLIENT_ID && brokerConfig.ZEEBE_CLIENT_ID.startsWith('PNNBn')) {
        const CLUSTER_89 = {
            ZEEBE_CLIENT_ID: brokerConfig.ZEEBE_CLIENT_ID,
            ZEEBE_CLIENT_SECRET: brokerConfig.ZEEBE_CLIENT_SECRET,
            ZEEBE_CLOUD_CLUSTER_ID: '792e33ba-1b98-47c9-9ce9-abfcea49829b',
            ZEEBE_CLOUD_REGION: 'ont-1',
            ZEEBE_AUTHORIZATION_SERVER_URL: 'https://login.cloud.camunda.io/oauth/token'
        };

        updateEnvFile(mortgageRootEnv, { ...CLUSTER_89, ...ORG_CONFIG });
    } else {
        console.error('❌ Broker .env does NOT contain PNNBn credentials! Cannot update Mortgage root .env securely.');
    }
}
