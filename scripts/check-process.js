#!/usr/bin/env node
/**
 * Quick check for a specific process instance
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const CLIENT_ID = process.env.ZEEBE_CLIENT_ID;
const CLIENT_SECRET = process.env.ZEEBE_CLIENT_SECRET;
const CLUSTER_ID = process.env.ZEEBE_CLOUD_CLUSTER_ID;
const REGION = process.env.ZEEBE_CLOUD_REGION || 'ont-1';
const AUTH_URL = process.env.ZEEBE_AUTHORIZATION_SERVER_URL || 'https://login.cloud.camunda.io/oauth/token';

const OPERATE_BASE_URL = `https://${REGION}.operate.camunda.io/${CLUSTER_ID}/v1`;

const PROCESS_KEY = process.argv[2] || '6755399441993621';

async function getOperateToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('audience', 'operate.camunda.io');
    const response = await axios.post(AUTH_URL, params);
    return response.data.access_token;
}

async function run() {
    const token = await getOperateToken();

    // Get process instance details
    console.log(`\n📋 Process Instance: ${PROCESS_KEY}`);
    try {
        const instResp = await axios.get(`${OPERATE_BASE_URL}/process-instances/${PROCESS_KEY}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Status:', instResp.data.state);
        console.log('Has Incident:', instResp.data.incident);
    } catch (e) {
        console.log('Instance not found yet in Operate');
    }

    // Get incidents
    console.log('\n🔴 Incidents:');
    try {
        const incResp = await axios.post(`${OPERATE_BASE_URL}/incidents/search`, {
            filter: { processInstanceKey: parseInt(PROCESS_KEY) }
        }, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const incidents = incResp.data.items || [];
        if (incidents.length === 0) {
            console.log('   No incidents!');
        } else {
            incidents.forEach((inc, i) => {
                console.log(`   ${i + 1}. Type: ${inc.type || inc.errorType}`);
                console.log(`      Message: ${inc.message || inc.errorMessage}`);
                console.log(`      Flow Node: ${inc.flowNodeId}`);
                console.log(`      Job Key: ${inc.jobKey}`);
            });
        }
    } catch (e) {
        console.log('   Error fetching incidents:', e.response?.data || e.message);
    }

    // Get flow node instances (to see where it's stuck)
    console.log('\n📍 Active Flow Nodes:');
    try {
        const fnResp = await axios.post(`${OPERATE_BASE_URL}/flownode-instances/search`, {
            filter: { processInstanceKey: parseInt(PROCESS_KEY) }
        }, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const nodes = fnResp.data.items || [];
        nodes.filter(n => n.state === 'ACTIVE' || n.state === 'INCIDENT').forEach(n => {
            console.log(`   [${n.state}] ${n.flowNodeId} (${n.flowNodeName || 'unnamed'})`);
        });
    } catch (e) {
        console.log('   Error:', e.response?.data || e.message);
    }

    // Get variables
    console.log('\n📦 Variables:');
    try {
        const varResp = await axios.post(`${OPERATE_BASE_URL}/variables/search`, {
            filter: { processInstanceKey: parseInt(PROCESS_KEY) }
        }, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const vars = varResp.data.items || [];
        vars.forEach(v => {
            let val = v.value;
            if (val && val.length > 100) val = val.substring(0, 100) + '...';
            console.log(`   ${v.name}: ${val}`);
        });
    } catch (e) {
        console.log('   Error:', e.response?.data || e.message);
    }
}

run().catch(e => console.error('Error:', e.message));
