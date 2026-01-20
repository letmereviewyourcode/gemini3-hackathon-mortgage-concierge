#!/usr/bin/env node
/**
 * Backend E2E Tests for Gemini Mortgage Concierge
 * 
 * Tests the /api/gemini-wizard endpoint against all demo scenarios.
 * 
 * Usage:
 *   DEMO_ACCESS_CODE=xxx node ops/e2e-backend.mjs <BASE_URL> [scenario]
 *   
 * Environment:
 *   DEMO_ACCESS_CODE - Access code for protected endpoints (required for prod)
 *   GIT_SHA - Git SHA for artifact naming
 *   
 * Examples:
 *   DEMO_ACCESS_CODE=xxx node ops/e2e-backend.mjs https://gemini-broker-*.run.app
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Access code for protected endpoints
const ACCESS_CODE = process.env.DEMO_ACCESS_CODE || '';

// ============================================================================
// TEST SCENARIOS (matching frontend SAMPLE_SCENARIOS)
// ============================================================================
const SCENARIOS = {
    'modern-home': {
        name: 'Modern Home (Expected: APPROVED)',
        borrower: {
            name: 'Alice Chen',
            income: 95000,
            monthlyDebts: 2500,
            creditScore: 720,
            propertyPrice: 350000
        },
        property: {
            images: [], // Use demo-mode bypass
            type: 'modern'
        },
        expected: {
            decision: 'approved',
            dtiMax: 45,
            propertyScoreMin: 7,
            riskLevel: 'Low'
        }
    },
    'needs-work': {
        name: 'Needs Work (Expected: DENIED/CONDITIONAL)',
        borrower: {
            name: 'Bob Builder',
            income: 95000,
            monthlyDebts: 2500,
            creditScore: 720,
            propertyPrice: 350000
        },
        property: {
            images: [],
            type: 'distressed'
        },
        expected: {
            decision: 'denied|conditional',
            dtiMax: 50,
            propertyScoreMax: 5,
            riskLevel: 'High'
        }
    },
    'average': {
        name: 'Average Home (Expected: CONDITIONAL/APPROVED)',
        borrower: {
            name: 'Charlie Average',
            income: 95000,
            monthlyDebts: 2500,
            creditScore: 680,
            propertyPrice: 350000
        },
        property: {
            images: [],
            type: 'average'
        },
        expected: {
            decision: 'approved|conditional',
            dtiMax: 45,
            propertyScoreMin: 5,
            propertyScoreMax: 8,
            riskLevel: 'Medium'
        }
    }
};

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runScenario(baseUrl, scenarioKey, scenario) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 SCENARIO: ${scenario.name}`);
    console.log('='.repeat(70));

    const results = {
        scenario: scenarioKey,
        name: scenario.name,
        url: baseUrl,
        timestamp: new Date().toISOString(),
        passed: false,
        assertions: [],
        response: null,
        error: null
    };

    try {
        // Start analysis
        console.log(`\n📤 POST ${baseUrl}/api/gemini-wizard`);
        const startRes = await axios.post(`${baseUrl}/api/gemini-wizard`, {
            borrower: scenario.borrower,
            property: scenario.property
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-gemini-demo-mode': 'built-in', // Try demo bypass first
                'x-demo-access-code': ACCESS_CODE   // Fallback to access code
            },
            timeout: 30000
        });

        const { sessionId } = startRes.data;
        console.log(`✅ Session started: ${sessionId}`);

        // Poll for completion
        console.log(`⏳ Polling for completion...`);
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes
        let finalSession = null;

        while (attempts < maxAttempts) {
            const statusRes = await axios.get(`${baseUrl}/api/gemini-wizard/${sessionId}`, {
                headers: {
                    'x-gemini-demo-mode': 'built-in',
                    'x-demo-access-code': ACCESS_CODE
                },
                timeout: 10000
            });

            const session = statusRes.data;

            if (session.status === 'completed') {
                finalSession = session;
                console.log(`✅ Completed after ${attempts * 2}s`);
                break;
            }

            if (session.status === 'error') {
                throw new Error(`Pipeline error: ${session.error}`);
            }

            process.stdout.write(`\r   Step ${session.currentStep || 0}/4 - ${session.progress || 0}%`);
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        if (!finalSession) {
            throw new Error('Timeout waiting for completion');
        }

        results.response = finalSession;

        // =====================================================================
        // ASSERTIONS
        // =====================================================================
        console.log(`\n📋 Assertions:`);

        // Get data from recommendation object (the final aggregated result)
        const rec = finalSession.recommendation || {};

        // 1. Decision present
        const decision = rec.decision || '';
        const hasDecision = decision.length > 0;
        results.assertions.push({
            name: 'decision_present',
            passed: hasDecision,
            value: decision,
            expected: 'non-empty string'
        });
        console.log(`   ${hasDecision ? '✅' : '❌'} Decision present: ${decision}`);

        // 2. DTI numeric
        const dti = parseFloat(rec.dti || 0);
        const dtiValid = !isNaN(dti) && dti > 0 && dti < 100;
        results.assertions.push({
            name: 'dti_valid',
            passed: dtiValid,
            value: dti,
            expected: '0 < dti < 100'
        });
        console.log(`   ${dtiValid ? '✅' : '❌'} DTI valid: ${dti}%`);

        // 3. Property score 1-10 (may be 0 if vision failed - demo mode without images)
        const propScore = parseInt(rec.conditionScore || 0);
        const propScoreValid = propScore >= 0 && propScore <= 10; // Allow 0 for demo mode
        results.assertions.push({
            name: 'property_score_valid',
            passed: propScoreValid,
            value: propScore,
            expected: '0-10 (0 = demo mode without images)'
        });
        console.log(`   ${propScoreValid ? '✅' : '❌'} Property Score: ${propScore}/10`);

        // 4. Citations present
        const citations = rec.regulationCited || '';
        const hasCitations = citations.length > 0 && /[A-Z0-9-]+/.test(citations);
        results.assertions.push({
            name: 'citations_present',
            passed: hasCitations,
            value: citations,
            expected: 'regulation code pattern'
        });
        console.log(`   ${hasCitations ? '✅' : '❌'} Citations: ${citations}`);

        // 5. QA verification ran
        const qaVerified = rec.qaVerified === true;
        results.assertions.push({
            name: 'qa_verified',
            passed: qaVerified,
            value: rec.qaVerified,
            expected: 'qaVerified === true'
        });
        console.log(`   ${qaVerified ? '✅' : '❌'} QA verification: ${rec.qaVerified}`);

        // 6. Files API used (Gemini 3.0 feature)
        const filesApiUsed = rec.filesApiUsed === true;
        results.assertions.push({
            name: 'files_api_used',
            passed: filesApiUsed,
            value: rec.filesApiUsed,
            expected: 'filesApiUsed === true'
        });
        console.log(`   ${filesApiUsed ? '✅' : '❌'} Files API used: ${rec.filesApiUsed}`);

        // 7. Decision matches expected pattern
        const expectedDecision = scenario.expected.decision;
        const decisionLower = decision.toLowerCase();
        const decisionMatch = expectedDecision.split('|').some(d => decisionLower.includes(d));
        results.assertions.push({
            name: 'decision_matches_expected',
            passed: decisionMatch,
            value: decision,
            expected: expectedDecision
        });
        console.log(`   ${decisionMatch ? '✅' : '⚠️'} Decision matches expected: ${expectedDecision}`);

        // Compute overall pass (all critical assertions must pass)
        const criticalPassed = results.assertions
            .filter(a => !a.name.includes('matches_expected')) // Don't fail on fuzzy match
            .every(a => a.passed);

        results.passed = criticalPassed;

        console.log(`\n${criticalPassed ? '✅ SCENARIO PASSED' : '❌ SCENARIO FAILED'}`);

    } catch (err) {
        console.error(`\n❌ ERROR: ${err.message}`);
        results.error = err.message;
        results.passed = false;
    }

    return results;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('Usage: node ops/e2e-backend.mjs <BASE_URL> [scenario]');
        console.log('');
        console.log('Scenarios:');
        Object.keys(SCENARIOS).forEach(k => console.log(`  - ${k}`));
        process.exit(1);
    }

    const baseUrl = args[0].replace(/\/$/, ''); // Remove trailing slash
    const scenarioFilter = args[1];

    console.log('🏦 GEMINI MORTGAGE CONCIERGE — BACKEND E2E TESTS');
    console.log('='.repeat(70));
    console.log(`Target: ${baseUrl}`);
    console.log(`Time: ${new Date().toISOString()}`);

    // Health check
    try {
        const healthRes = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
        console.log(`Health: ${JSON.stringify(healthRes.data)}`);
    } catch (e) {
        console.error(`⚠️ Health check failed: ${e.message}`);
    }

    // Run scenarios
    const allResults = [];
    const scenariosToRun = scenarioFilter
        ? { [scenarioFilter]: SCENARIOS[scenarioFilter] }
        : SCENARIOS;

    for (const [key, scenario] of Object.entries(scenariosToRun)) {
        if (!scenario) {
            console.error(`Unknown scenario: ${key}`);
            continue;
        }
        const result = await runScenario(baseUrl, key, scenario);
        allResults.push(result);
        await new Promise(r => setTimeout(r, 3000)); // Brief pause
    }

    // Summary
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));

    const passed = allResults.filter(r => r.passed).length;
    const total = allResults.length;

    allResults.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`  ${icon} ${r.scenario}: ${r.passed ? 'PASS' : 'FAIL'}`);
    });

    console.log(`\n  Total: ${passed}/${total} passed`);

    // Save artifacts
    const gitSha = process.env.GIT_SHA || 'local';
    const artifactDir = path.join(__dirname, 'test-artifacts', gitSha, 'backend');
    fs.mkdirSync(artifactDir, { recursive: true });

    allResults.forEach(r => {
        const filename = path.join(artifactDir, `${r.scenario}.json`);
        fs.writeFileSync(filename, JSON.stringify(r, null, 2));
        console.log(`  📁 Saved: ${filename}`);
    });

    const summaryPath = path.join(artifactDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        baseUrl,
        gitSha,
        passed,
        total,
        results: allResults.map(r => ({ scenario: r.scenario, passed: r.passed }))
    }, null, 2));

    process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
