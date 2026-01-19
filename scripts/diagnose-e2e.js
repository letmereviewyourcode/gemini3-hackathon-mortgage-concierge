#!/usr/bin/env node
/**
 * E2E Diagnostic Script for Mortgage Concierge
 * Queries Camunda Operate REST API to check process instances and system health
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from broker/.env to ensure we use valid credentials (Cluster 8.9)
const envPath = path.resolve(__dirname, 'broker/.env');
console.log(`📂 Loading Env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`   ZEEBE_CLIENT_ID: ${process.env.ZEEBE_CLIENT_ID?.substring(0, 10)}...`);
} else {
    console.error('❌ broker/.env not found at:', envPath);
    process.exit(1);
}

// Config
const CLIENT_ID = process.env.ZEEBE_CLIENT_ID;
const CLIENT_SECRET = process.env.ZEEBE_CLIENT_SECRET;
const CLUSTER_ID = process.env.ZEEBE_CLOUD_CLUSTER_ID;
const REGION = process.env.ZEEBE_CLOUD_REGION || 'ont-1';
const AUTH_URL = process.env.ZEEBE_AUTHORIZATION_SERVER_URL || 'https://login.cloud.camunda.io/oauth/token';

if (!CLIENT_ID || !CLIENT_SECRET || !CLUSTER_ID) {
    console.error('❌ Missing required env vars: ZEEBE_CLIENT_ID, ZEEBE_CLIENT_SECRET, ZEEBE_CLOUD_CLUSTER_ID');
    console.log('Available keys:', Object.keys(process.env).filter(k => k.startsWith('ZEEBE') || k.startsWith('C8')).join(', '));
    process.exit(1);
}

const OPERATE_BASE_URL = `https://${REGION}.operate.camunda.io/${CLUSTER_ID}/v1`;
const ZEEBE_REST_URL = `https://${REGION}.zeebe.camunda.io/${CLUSTER_ID}/v2`;

console.log('\n📊 CAMUNDA E2E DIAGNOSTIC');
console.log('='.repeat(60));
console.log(`Cluster: ${CLUSTER_ID}`);
console.log(`Region: ${REGION}`);
console.log(`Operate URL: ${OPERATE_BASE_URL}`);
console.log(`Zeebe REST URL: ${ZEEBE_REST_URL}`);
console.log('='.repeat(60));

async function getOperateToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('audience', 'operate.camunda.io');

    const response = await axios.post(AUTH_URL, params);
    return response.data.access_token;
}

async function searchProcessInstances(token) {
    console.log('\n🔍 Searching for recent process instances...');

    try {
        const response = await axios.post(`${OPERATE_BASE_URL}/process-instances/search`, {
            filter: {},
            sort: [{ field: 'startDate', order: 'DESC' }],
            size: 15
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const instances = response.data.items || [];
        console.log(`📋 Found ${instances.length} process instances:\n`);

        if (instances.length === 0) {
            console.log('⚠️  NO PROCESS INSTANCES FOUND IN CAMUNDA!');
            console.log('   This confirms no processes have been started.');
            return;
        }

        instances.forEach((inst, idx) => {
            const status = inst.state === 'ACTIVE' ? '🟢 ACTIVE' :
                inst.state === 'COMPLETED' ? '✅ COMPLETED' :
                    inst.state === 'INCIDENT' ? '🔴 INCIDENT' : `⚪ ${inst.state}`;

            console.log(`${idx + 1}. ${status} | Key: ${inst.key}`);
            console.log(`   Process: ${inst.bpmnProcessId} (v${inst.processVersion})`);
            console.log(`   Started: ${inst.startDate}`);
            if (inst.endDate) console.log(`   Ended: ${inst.endDate}`);
            console.log('');
        });

        // Check for incidents
        const activeWithIncidents = instances.filter(i => i.state === 'ACTIVE' && i.incident);
        if (activeWithIncidents.length > 0) {
            console.log('🔴 ACTIVE PROCESSES WITH INCIDENTS:');
            for (const inst of activeWithIncidents) {
                console.log(`   - ${inst.key}: ${inst.bpmnProcessId}`);
            }
        }

        return instances;
    } catch (error) {
        console.error('❌ Failed to search process instances:', error.response?.data || error.message);
    }
}

async function checkRecentIncidents(token) {
    console.log('\n🔴 Checking for recent incidents...');

    try {
        const response = await axios.post(`${OPERATE_BASE_URL}/incidents/search`, {
            filter: {},
            sort: [{ field: 'creationTime', order: 'DESC' }],
            size: 10
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const incidents = response.data.items || [];
        if (incidents.length === 0) {
            console.log('✅ No active incidents found.');
            return;
        }

        console.log(`⚠️  Found ${incidents.length} incidents:\n`);
        incidents.forEach((inc, idx) => {
            console.log(`\n${idx + 1}. Raw Object: ${JSON.stringify(inc)}`);
            console.log(`   Type: ${inc.errorType}`);
            console.log(`   Message: ${inc.errorMessage}`);
            console.log(`   Process Instance: ${inc.processInstanceKey}`);
            console.log(`   Flow Node: ${inc.flowNodeId}`);
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to check incidents:', error.response?.data || error.message);
    }
}

async function checkVariablesForProcess(processInstanceKey, token) {
    console.log(`\n📦 Checking variables for process ${processInstanceKey}...`);

    try {
        const response = await axios.post(`${OPERATE_BASE_URL}/variables/search`, {
            filter: { processInstanceKey: parseInt(processInstanceKey) },
            size: 50
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const vars = response.data.items || [];
        const variables = {};

        vars.forEach(v => {
            // Keep the latest value if multiple versions exist
            variables[v.name] = v.value.length > 50 && !v.value.includes('http')
                ? v.value.substring(0, 50) + '...'
                : JSON.parse(v.value); // Parse the value string
        });

        console.log(`Found ${Object.keys(variables).length} variables:`);
        console.log(JSON.stringify(variables, null, 3));
    } catch (error) {
        console.error('❌ Failed to check variables:', error.response?.data || error.message);
    }
}

async function checkLocalServices() {
    console.log('\n🔧 Checking local services...');

    const services = [
        { name: 'Broker', port: 4000 },
        { name: 'Underwriter', port: 4001 },
        { name: 'Researcher', port: 4002 }
    ];

    for (const svc of services) {
        try {
            const response = await axios.get(`http://localhost:${svc.port}/health`, { timeout: 2000 });
            console.log(`   ✅ ${svc.name} (port ${svc.port}): UP`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`   ❌ ${svc.name} (port ${svc.port}): DOWN - NOT RUNNING`);
            } else if (error.response) {
                console.log(`   ⚠️  ${svc.name} (port ${svc.port}): Responding but no /health endpoint`);
            } else {
                console.log(`   ❌ ${svc.name} (port ${svc.port}): ${error.message}`);
            }
        }
    }

    // Check ngrok tunnels
    try {
        const response = await axios.get('http://localhost:4040/api/tunnels', { timeout: 2000 });
        const tunnels = response.data.tunnels || [];
        console.log(`\n🌍 Ngrok tunnels (${tunnels.length}):`);
        tunnels.forEach(t => {
            console.log(`   ${t.name}: ${t.public_url} -> ${t.config.addr}`);
        });
    } catch (error) {
        console.log('   ⚠️  Ngrok not running or not accessible on localhost:4040');
    }
}

async function run() {
    try {
        // Check local services first
        await checkLocalServices();

        // Get Operate token and query Camunda
        console.log('\n🔐 Getting Camunda Operate token...');
        const operateToken = await getOperateToken();
        console.log('✅ Got Operate token');

        const instances = await searchProcessInstances(operateToken);
        await checkRecentIncidents(operateToken);

        // If we found active instances, check variables for the most recent one
        if (instances && instances.length > 0) {
            const activeInstances = instances.filter(i => i.state === 'ACTIVE');
            if (activeInstances.length > 0) {
                await checkVariablesForProcess(activeInstances[0].key, operateToken);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 DIAGNOSTIC SUMMARY');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Diagnostic failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

run();
