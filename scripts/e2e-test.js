#!/usr/bin/env node
/**
 * Mortgage Concierge Wizard - E2E Testing Script
 * 
 * Tests various applicant profiles through the complete workflow
 * Usage: node e2e-test.js [test-name]
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BROKER_URL = 'http://localhost:4000';

// Test Cases - Various Applicant Profiles
const TEST_CASES = {
    // Excellent credit, high income, low debt
    excellent_profile: {
        name: "Excellent Profile (Premium Applicant)",
        data: {
            fullName: "Sarah Excellence",
            annualIncome: "350000",
            monthlyDebts: "1500",
            creditScore: "820",
            email: "sarah@example.com",
            phone: "555-0001",
            propertyAddress: "100 Premium Lane, Beverly Hills, CA",
            purchasePrice: "1200000",
            downPayment: "300000",
            propertyType: "single-family",
            intendedUse: "primary"
        },
        expected: {
            dti: "< 10%",
            tier: "EXCELLENT",
            approval: "HIGH"
        }
    },

    // Good credit, moderate income
    good_profile: {
        name: "Good Profile (Standard Applicant)",
        data: {
            fullName: "John Standard",
            annualIncome: "120000",
            monthlyDebts: "1000",
            creditScore: "720",
            email: "john@example.com",
            phone: "555-0002",
            propertyAddress: "456 Main Street, Austin, TX",
            purchasePrice: "400000",
            downPayment: "80000",
            propertyType: "single-family",
            intendedUse: "primary"
        },
        expected: {
            dti: "~10-15%",
            tier: "GOOD",
            approval: "LIKELY"
        }
    },

    // Fair credit, higher debt
    fair_profile: {
        name: "Fair Profile (Marginal Applicant)",
        data: {
            fullName: "Mike Marginal",
            annualIncome: "75000",
            monthlyDebts: "2500",
            creditScore: "650",
            email: "mike@example.com",
            phone: "555-0003",
            propertyAddress: "789 Budget Blvd, Phoenix, AZ",
            purchasePrice: "280000",
            downPayment: "35000",
            propertyType: "condo",
            intendedUse: "primary"
        },
        expected: {
            dti: "~40%",
            tier: "FAIR",
            approval: "CONDITIONAL"
        }
    },

    // Poor credit, high debt - likely rejection
    poor_profile: {
        name: "Poor Profile (Risky Applicant)",
        data: {
            fullName: "Dan Decline",
            annualIncome: "45000",
            monthlyDebts: "3000",
            creditScore: "520",
            email: "dan@example.com",
            phone: "555-0004",
            propertyAddress: "999 Last Resort Ave, Detroit, MI",
            purchasePrice: "180000",
            downPayment: "10000",
            propertyType: "multi-family",
            intendedUse: "investment"
        },
        expected: {
            dti: "> 80%",
            tier: "POOR",
            approval: "UNLIKELY"
        }
    },

    // First-time buyer, young professional
    first_time_buyer: {
        name: "First-Time Buyer (Young Professional)",
        data: {
            fullName: "Emma Firsttime",
            annualIncome: "85000",
            monthlyDebts: "800",
            creditScore: "710",
            email: "emma@example.com",
            phone: "555-0005",
            propertyAddress: "222 Starter Home Dr, Denver, CO",
            purchasePrice: "320000",
            downPayment: "16000",
            propertyType: "condo",
            intendedUse: "primary"
        },
        expected: {
            dti: "~11%",
            tier: "GOOD",
            approval: "LIKELY (FHA eligible)"
        }
    }
};

async function runTest(testName, testCase) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Expected: DTI ${testCase.expected.dti}, Tier: ${testCase.expected.tier}, Approval: ${testCase.expected.approval}`);

    try {
        // Start the mortgage process
        console.log('\n🚀 Starting mortgage application...');
        const startTime = Date.now();

        const response = await axios.post(`${BROKER_URL}/api/wizard/start-mortgage`, testCase.data);

        if (!response.data.success) {
            throw new Error('Process failed to start');
        }

        const { processInstanceKey, sessionId } = response.data;
        console.log(`✅ Process started: ${processInstanceKey}`);
        console.log(`📋 Session ID: ${sessionId}`);

        // Poll for completion
        console.log('\n⏳ Waiting for process completion...');
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes max
        let finalStatus = null;

        while (attempts < maxAttempts) {
            try {
                const statusResponse = await axios.get(`${BROKER_URL}/api/ai-agent-chat/session/${sessionId}`);
                const status = statusResponse.data;

                if (status.status === 'completed') {
                    finalStatus = status;
                    break;
                } else if (status.status === 'error') {
                    throw new Error(`Process errored: ${status.error}`);
                }

                process.stdout.write(`\r   Progress: ${status.progress || 0}% - ${status.message || 'Processing...'}`);
            } catch (e) {
                // Status endpoint may not exist, just wait
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        if (finalStatus) {
            console.log(`\n\n✅ COMPLETED in ${duration}s`);
            console.log(`📄 Recommendation preview: ${(finalStatus.reply || '').substring(0, 500)}...`);
        } else {
            console.log(`\n\n⏱️  Timeout after ${duration}s (process may still be running)`);
        }

        return { success: true, processInstanceKey, duration };

    } catch (error) {
        console.error(`\n❌ FAILED: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runAllTests() {
    console.log('\n🏦 MORTGAGE CONCIERGE WIZARD - E2E TEST SUITE');
    console.log('='.repeat(60));

    const results = [];

    for (const [testName, testCase] of Object.entries(TEST_CASES)) {
        const result = await runTest(testName, testCase);
        results.push({ testName, ...result });

        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Summary
    console.log('\n\n📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    results.forEach(r => {
        const status = r.success ? '✅ PASS' : '❌ FAIL';
        const duration = r.duration ? ` (${r.duration}s)` : '';
        console.log(`  ${status} ${r.testName}${duration}`);
    });

    console.log(`\n  Total: ${passed}/${results.length} passed`);

    return failed === 0;
}

async function runSingleTest(testName) {
    if (!TEST_CASES[testName]) {
        console.error(`Unknown test: ${testName}`);
        console.log('Available tests:', Object.keys(TEST_CASES).join(', '));
        process.exit(1);
    }

    await runTest(testName, TEST_CASES[testName]);
}

// Main
const testArg = process.argv[2];

if (testArg === 'all' || !testArg) {
    runAllTests().then(success => process.exit(success ? 0 : 1));
} else if (testArg === 'list') {
    console.log('Available tests:');
    Object.entries(TEST_CASES).forEach(([name, tc]) => {
        console.log(`  - ${name}: ${tc.name}`);
    });
} else {
    runSingleTest(testArg);
}
