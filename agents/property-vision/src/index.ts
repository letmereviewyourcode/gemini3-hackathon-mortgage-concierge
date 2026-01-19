import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Load environment variables
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: rootEnvPath });

const app = express();
const PORT = process.env.PORT || process.env.VISION_PORT || 4023;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ FATAL: GEMINI_API_KEY not found");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const TARGET_MODEL = "gemini-3.0-flash-preview";
const FALLBACK_MODEL = "gemini-2.0-flash-exp";

async function getModel() {
    try {
        const model = genAI.getGenerativeModel({ model: TARGET_MODEL });
        await model.countTokens("Ping");
        console.log(`✅ Using ${TARGET_MODEL}`);
        return model;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`⚠️ ${TARGET_MODEL} unavailable (${message}). Falling back to ${FALLBACK_MODEL}`);
        return genAI.getGenerativeModel({ model: FALLBACK_MODEL });
    }
}

// Fetch image as base64
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const base64 = Buffer.from(response.data).toString('base64');
        return { data: base64, mimeType: contentType };
    } catch (e) {
        console.warn(`Failed to fetch image: ${url}`);
        return null;
    }
}

// Scrape images from real estate listing URL
async function scrapeListingImages(url: string): Promise<string[]> {
    try {
        console.log(`🔍 Scraping listing: ${url}`);
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        const images: string[] = [];

        // Common image selectors for real estate sites
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
            if (src && (src.includes('http') || src.startsWith('//'))) {
                const fullUrl = src.startsWith('//') ? 'https:' + src : src;
                // Filter for property images (usually larger)
                if (fullUrl.includes('photo') || fullUrl.includes('image') || fullUrl.includes('media') ||
                    fullUrl.includes('zillow') || fullUrl.includes('redfin') || fullUrl.includes('streeteasy')) {
                    images.push(fullUrl);
                }
            }
        });

        // Also check for background images in style attributes
        $('[style*="background-image"]').each((_, el) => {
            const style = $(el).attr('style') || '';
            const match = style.match(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/);
            if (match) images.push(match[1]);
        });

        console.log(`   Found ${images.length} potential images`);
        return [...new Set(images)].slice(0, 10); // Dedupe and limit
    } catch (e) {
        console.error(`Failed to scrape listing: ${e}`);
        return [];
    }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let publicUrl = `http://localhost:${PORT}`;

app.use((req, res, next) => {
    console.log(`🎥 [Property Vision] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.get('/.well-known/agent-card.json', (req, res) => {
    const cardPath = path.join(process.cwd(), 'agent-card.json');
    const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
    card.url = publicUrl;
    res.json(card);
});

app.post('/', async (req, res) => {
    console.log('👁️ [Vision Agent] Request:', JSON.stringify(req.body, null, 2).substring(0, 500));

    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
        return res.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id });
    }

    if (method === 'agent/authenticatedExtendedCard') {
        const cardPath = path.join(process.cwd(), 'agent-card.json');
        const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
        card.url = publicUrl;
        return res.json({ jsonrpc: '2.0', result: card, id });
    }

    if (method === 'tasks/send' || method === 'message/send') {
        try {
            const data = params?.data || {};
            const inputType = data.inputType || 'demo'; // 'demo', 'listing', 'images'
            const videoUrl = data.videoUrl || '';
            const listingUrl = data.listingUrl || '';
            const images = data.images || []; // Array of base64 or URLs
            const propertyType = data.propertyType || "Home";

            console.log(`📹 Input Type: ${inputType}`);

            const schema = `{
                "conditionScore": number (1-10),
                "features": ["string"],
                "defects": ["string"],
                "renovationSuggestions": ["string"],
                "marketValueAdjustment": number (percentage),
                "summary": "string"
            }`;

            let promptParts: any[] = [];
            promptParts.push(`You are a Property Vision Agent using Gemini 3 Flash.
            Analyze the provided property images/video of a ${propertyType}.
            Identify key features, condition issues, renovation needs, and estimate a "Condition Score" (1-10).
            Be CRITICAL and THOROUGH. Look for: water damage, mold, structural cracks, outdated systems, roof condition, HVAC, electrical panels, flooring quality, kitchen/bathroom condition.
            
            Return ONLY valid JSON: ${schema}`);

            if (inputType === 'images' && images.length > 0) {
                // REAL MULTIMODAL: User uploaded images
                console.log(`   --> Processing ${images.length} uploaded images (REAL MULTIMODAL)`);

                for (const img of images.slice(0, 5)) { // Max 5 images
                    if (img.startsWith('data:')) {
                        const base64Data = img.split(',')[1];
                        const mimeType = img.split(';')[0].split(':')[1];
                        promptParts.push({
                            inlineData: { data: base64Data, mimeType }
                        });
                    } else if (img.startsWith('http')) {
                        const imageData = await fetchImageAsBase64(img);
                        if (imageData) {
                            promptParts.push({
                                inlineData: imageData
                            });
                        }
                    }
                }
            } else if (inputType === 'listing' && listingUrl) {
                // REAL MULTIMODAL: Scrape listing and analyze images
                console.log(`   --> Scraping listing URL: ${listingUrl}`);

                const imageUrls = await scrapeListingImages(listingUrl);

                if (imageUrls.length === 0) {
                    throw new Error("Could not find images on listing page. Try uploading images directly.");
                }

                // Fetch first 5 images
                let loadedCount = 0;
                for (const imgUrl of imageUrls) {
                    if (loadedCount >= 5) break;
                    const imageData = await fetchImageAsBase64(imgUrl);
                    if (imageData) {
                        promptParts.push({
                            inlineData: imageData
                        });
                        loadedCount++;
                    }
                }

                if (loadedCount === 0) {
                    throw new Error("Failed to load any images from listing. Try uploading images directly.");
                }

                console.log(`   --> Loaded ${loadedCount} images for analysis`);
                promptParts.push(`\n\nListing URL: ${listingUrl}`);

            } else if (inputType === 'demo' && videoUrl) {
                // DEMO MODE: Simulated analysis (labeled honestly)
                console.log(`   --> Demo Mode (simulated analysis)`);

                const videoId = videoUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?]+)/)?.[1] || '';
                let scenarioContext = '';

                if (videoId === 'xYj4_g75FKM' || videoUrl.includes('xYj4')) {
                    scenarioContext = `[DEMO MODE - SIMULATED VIDEO ANALYSIS]
                    For this demo, we simulate analysis of a property with MAJOR issues:
                    - Visible water stains on ceiling, active moisture damage
                    - Black mold in bathroom
                    - Missing roof shingles
                    - Foundation cracks
                    - Non-functional HVAC
                    Score: 2-3/10. This property should be DENIED.`;
                } else if (videoId === '5X2n6Bb9V9s' || videoUrl.includes('5X2n')) {
                    scenarioContext = `[DEMO MODE - SIMULATED VIDEO ANALYSIS]
                    For this demo, we simulate analysis of a property with SEVERE mold:
                    - Black mold covering 30% of basement
                    - Flood damage evident
                    - Hazardous air quality
                    Score: 1-2/10. This property should be DENIED.`;
                } else if (videoId === 'pQrS_qTv3M0' || videoUrl.includes('pQrS')) {
                    scenarioContext = `[DEMO MODE - SIMULATED VIDEO ANALYSIS]
                    For this demo, we simulate analysis of an excellent property:
                    - Fresh paint, new flooring
                    - Updated kitchen and bathrooms
                    - Excellent roof condition
                    - Recently serviced HVAC
                    Score: 9/10. This property should be APPROVED.`;
                } else {
                    scenarioContext = `[DEMO MODE - SIMULATED VIDEO ANALYSIS]
                    Video URL: ${videoUrl}
                    Provide a moderate assessment (score 5-7) for demo purposes.`;
                }

                promptParts.push(scenarioContext);
            } else {
                throw new Error("No valid input provided. Use 'images', 'listing', or 'demo' mode.");
            }

            const activeModel = await getModel();
            const result = await activeModel.generateContent(promptParts);
            const reply = result.response.text();

            console.log("✅ Analysis Complete");

            let resultPayload;
            if (method === 'message/send') {
                resultPayload = {
                    kind: 'message',
                    role: 'agent',
                    messageId: (id || Date.now()).toString(),
                    contextId: (id || Date.now()).toString(),
                    parts: [{ kind: 'text', text: reply }]
                };
            } else {
                resultPayload = {
                    id: id || Date.now().toString(),
                    status: { state: 'completed' },
                    artifacts: [{ parts: [{ kind: 'text', text: reply }] }]
                };
            }
            return res.json({ jsonrpc: '2.0', result: resultPayload, id });

        } catch (e: any) {
            console.error("❌ Vision Error:", e.message);
            return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
        }
    }

    res.status(404).send();
});

app.listen(PORT, async () => {
    console.log(`👁️ Property Vision Agent (Gemini 3 Flash) listening on port ${PORT}`);
    try {
        const sharedFile = path.resolve(process.cwd(), '../../public-urls.json');
        if (fs.existsSync(sharedFile)) {
            const urls = JSON.parse(fs.readFileSync(sharedFile, 'utf-8'));
            if (urls.propertyVisionUrl) publicUrl = urls.propertyVisionUrl;
        }
    } catch (e) { }
    console.log(`   - Public URL: ${publicUrl}`);
});
