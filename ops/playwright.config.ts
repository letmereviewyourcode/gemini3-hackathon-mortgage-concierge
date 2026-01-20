import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Gemini Mortgage Concierge E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // Run scenarios sequentially to avoid rate limits
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker to respect rate limits
    reporter: [
        ['html', { outputFolder: 'test-artifacts/browser-report' }],
        ['json', { outputFile: 'test-artifacts/browser-results.json' }]
    ],
    use: {
        baseURL: process.env.TEST_URL || 'https://gemini-frontend-231423721146.us-central1.run.app',
        trace: 'on-first-retry',
        screenshot: 'on',
        video: 'on-first-retry',
    },
    timeout: 120000, // 2 minutes per test (analysis can be slow)
    expect: {
        timeout: 30000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    outputDir: 'test-artifacts/browser',
});
