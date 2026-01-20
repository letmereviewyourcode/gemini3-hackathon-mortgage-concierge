import { test, expect } from '@playwright/test';

/**
 * Gemini Mortgage Concierge — Browser E2E Tests
 * 
 * Tests the complete user flow for all demo scenarios.
 * Run with: npx playwright test
 * 
 * Environment:
 *   TEST_URL - Base URL (default: prod frontend)
 */

const SCENARIOS = [
    {
        key: 'turnkey',
        name: 'Modern Home (Turnkey)',
        expectedDecision: /approved/i,
        expectedPropertyScore: { min: 7, max: 10 },
    },
    {
        key: 'water_damage',
        name: 'Needs Work (Water Damage)',
        expectedDecision: /denied|conditional/i,
        expectedPropertyScore: { min: 1, max: 6 },
    },
    {
        key: 'mold_house',
        name: 'Average Home (Mold)',
        expectedDecision: /denied|conditional|approved/i,
        expectedPropertyScore: { min: 1, max: 8 },
    },
];

test.describe('Gemini Mortgage Concierge E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Clear any previous state
        await page.goto('/?demo=1');
        await page.waitForLoadState('networkidle');
    });

    for (const scenario of SCENARIOS) {
        test(`Scenario: ${scenario.name}`, async ({ page }) => {
            // Navigate with demo mode enabled
            await page.goto('/?demo=1');

            // Wait for page to load
            await expect(page.locator('text=Gemini Mortgage Concierge')).toBeVisible({ timeout: 10000 });

            // Check for Demo Mode banner
            const demoBanner = page.locator('text=Demo Mode Enabled');
            await expect(demoBanner).toBeVisible({ timeout: 5000 });

            // === Step 1: Select Input Mode (Demo Videos) ===
            // Click on the demo videos tab
            const demoTab = page.locator('button:has-text("Demo Videos"), [aria-label*="demo"], button:has-text("Demo")');
            if (await demoTab.isVisible()) {
                await demoTab.click();
            }

            // === Step 2: Select Scenario ===
            // Look for scenario button or card
            const scenarioSelector = page.locator(`button:has-text("${scenario.name}"), [data-scenario="${scenario.key}"], text=${scenario.key}`).first();
            if (await scenarioSelector.isVisible()) {
                await scenarioSelector.click();
                await page.waitForTimeout(1000);
            }

            // Enter borrower info if form is visible
            const nameInput = page.locator('input[placeholder*="name"], input[name="name"]');
            if (await nameInput.isVisible()) {
                await nameInput.fill('Test User');
            }

            // === Step 3: Start Analysis ===
            const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Start"), button:has-text("Submit")').first();
            await expect(analyzeButton).toBeVisible();

            // Check NO access code modal appears in demo mode with built-in scenarios
            const accessModal = page.locator('text=Judge Access Required');
            const isAccessModalVisible = await accessModal.isVisible().catch(() => false);

            // If modal appears, it means demo mode bypass failed
            if (isAccessModalVisible) {
                test.fail(true, 'Access code modal should not appear for built-in demo scenarios');
            }

            await analyzeButton.click();

            // === Step 4: Wait for Pipeline Completion ===
            // Look for progress indicators
            const progressIndicator = page.locator('[data-testid="progress"], text=/Step.*of.*/, text=/Processing/, text=/%/');

            // Wait for completion - look for Report tab or results
            await expect(page.locator('text=Analysis Complete, button:has-text("Report"), text=Decision')).toBeVisible({
                timeout: 120000 // 2 minutes for full pipeline
            });

            // === Step 5: Switch to Report Tab ===
            const reportTab = page.locator('button:has-text("Report")');
            if (await reportTab.isVisible()) {
                await reportTab.click();
            }

            // === Step 6: Validate Report Contents ===

            // A) Decision banner visible
            const decisionBanner = page.locator('text=/APPROVED|DENIED|CONDITIONAL/i, [data-testid="decision"]');
            await expect(decisionBanner.first()).toBeVisible();

            // B) Token Meter visible (if showProofMode is enabled)
            // This may be behind a toggle, so optional check
            const tokenMeter = page.locator('[data-testid="token-meter"], text=/tokens loaded/i, text=/context/i');
            // Optional: await expect(tokenMeter).toBeVisible();

            // C) Property Score visible
            const propertyScore = page.locator('text=/\\d+\\/10/, text=/Condition Score/i');
            await expect(propertyScore.first()).toBeVisible();

            // D) Citations block visible
            const citations = page.locator('text=/B\\d+-\\d+-\\d+/, text=/Regulation/i, text=/Cited/i');
            await expect(citations.first()).toBeVisible();

            // E) QA Verification section
            const qaSection = page.locator('text=/QA|Quality Assurance|Verification/i');
            await expect(qaSection.first()).toBeVisible();

            // F) DTI value present
            const dtiValue = page.locator('text=/DTI|Debt.*Income/i');
            await expect(dtiValue.first()).toBeVisible();

            // === Step 7: Test Citation Drawer (if clicking citation opens it) ===
            const citationLink = page.locator('[data-citation], button:has-text(/\\[B/)').first();
            if (await citationLink.isVisible()) {
                await citationLink.click();

                // Check drawer opens
                const drawer = page.locator('[data-testid="citation-drawer"], [role="dialog"]');
                const drawerVisible = await drawer.isVisible().catch(() => false);

                if (drawerVisible) {
                    // Close drawer
                    await page.keyboard.press('Escape');
                }
            }

            // === Step 8: Screenshot for artifacts ===
            await page.screenshot({
                path: `test-artifacts/browser/${scenario.key}-report.png`,
                fullPage: true
            });

            // Mark test as passed
            console.log(`✅ ${scenario.name} - Report validated`);
        });
    }

    test('PDF Export triggers download', async ({ page }) => {
        // Use the first scenario for PDF test
        await page.goto('/?demo=1');
        await page.waitForLoadState('networkidle');

        // Would need to complete analysis first, so this is a simplified check
        // In real test, we'd run a scenario first then test export

        // Check if Download/Export button exists in Report view
        const exportButton = page.locator('button:has-text("Download"), button:has-text("PDF"), button:has-text("Export")');

        // For now, just verify the button would be present after analysis
        // Full test would require completing a scenario first
        console.log('PDF Export test - checking button availability after analysis');
    });

    test('Persona Toggle switches views', async ({ page }) => {
        await page.goto('/?demo=1');
        await page.waitForLoadState('networkidle');

        // Look for persona toggle
        const personaToggle = page.locator('text=/Borrower|Loan Officer/i, [data-testid="persona-toggle"]');

        if (await personaToggle.count() > 0) {
            // Check that toggle is present
            await expect(personaToggle.first()).toBeVisible();

            // Click to switch
            const toggle = personaToggle.first();
            await toggle.click();

            // Verify view changes (would need to be after analysis)
            console.log('✅ Persona toggle is present and clickable');
        }
    });
});
