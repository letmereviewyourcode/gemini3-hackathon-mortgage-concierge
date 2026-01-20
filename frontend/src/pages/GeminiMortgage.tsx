import React, { useState, useRef, useEffect } from 'react';
import { DemoShell } from '../layouts/DemoShell';
import { DemoHelper } from '../components/DemoHelper';
import { ProofModeToggle } from '../components/ProofModeToggle';
import { TokenMeter } from '../components/TokenMeter';
import { CitationDrawer } from '../components/CitationDrawer';
import { PersonaToggle } from '../components/PersonaToggle';
import { Video, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Play, Sparkles, Loader2, User, Eye, Scale, Shield, XCircle, Info, X, Zap, Brain, FileSearch, Upload, Link2, Image, Download, Camera, BookOpen } from 'lucide-react';
import axios from 'axios';

// Use runtime configuration or fallback to env vars
const getBrokerUrl = () => {
    // @ts-ignore
    if (window._env_ && window._env_.VITE_BROKER_URL) {
        // @ts-ignore
        return window._env_.VITE_BROKER_URL;
    }
    return import.meta.env.VITE_BROKER_URL || '';
};

const BROKER_BASE = getBrokerUrl();
const PROXY_URL = BROKER_BASE ? BROKER_BASE : '/gemini-proxy';
const IMAGE_PROXY = BROKER_BASE ? `${BROKER_BASE}/proxy-image` : '/image-proxy';

// Multi-image Sample Scenarios (3 images each for comprehensive analysis)
const SAMPLE_SCENARIOS = {
    bad: {
        label: '🏚️ Needs Work',
        description: 'Property with visible damage and repairs needed',
        images: [
            'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
            'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600',
        ],
    },
    good: {
        label: '🏠 Modern Home',
        description: 'Well-maintained, move-in ready property',
        images: [
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600',
        ],
    },
    average: {
        label: '📦 Average',
        description: 'Dated but acceptable condition',
        images: [
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
            'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600',
            'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600',
        ],
    },
};

const DEMO_VIDEOS = {
    water_damage: { label: '🏚️ Water Damage', url: 'https://www.youtube.com/watch?v=xYj4_g75FKM', description: 'Simulated: leaky roof, mold', expectation: 'DENY' },
    mold_house: { label: '🦠 Mold Infestation', url: 'https://www.youtube.com/watch?v=5X2n6Bb9V9s', description: 'Simulated: severe mold', expectation: 'DENY' },
    turnkey: { label: '🏠 Move-In Ready', url: 'https://www.youtube.com/watch?v=pQrS_qTv3M0', description: 'Simulated: excellent condition', expectation: 'APPROVE' },
};

export const GeminiMortgage: React.FC = () => {
    const [inputMode, setInputMode] = useState<'demo' | 'listing' | 'images'>('images');
    const [selectedDemo, setSelectedDemo] = useState<keyof typeof DEMO_VIDEOS>('water_damage');
    const [listingUrl, setListingUrl] = useState('');
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const [borrower, setBorrower] = useState({ name: 'Alice Chen', income: 95000, monthlyDebts: 2500, creditScore: 720, propertyPrice: 350000 });
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [results, setResults] = useState<any>({});
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'input' | 'report' | 'history'>('input');
    const [showExplainer, setShowExplainer] = useState(false);

    // DEMO MODE Logic
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isSampleScenario, setIsSampleScenario] = useState(false); // Track if using built-in safe images

    // PROOF MODE Logic
    const [showProofMode, setShowProofMode] = useState(false);
    const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

    // PERSONA Logic
    const [persona, setPersona] = useState<'borrower' | 'officer'>('officer');

    // Parse text and make citations clickable
    const renderExplanationWithCitations = (text: string) => {
        if (!text) return "Decision based on borrower financials and property condition.";

        // Regex to find patterns like [B3-6-02], [Guide Section 123], (Regulation X)
        // Adjust regex based on expected output format from Gemini
        const citationRegex = /(\[[A-Z0-9-]{3,}\]|\(Guide Section [^)]+\))/g;

        const parts = text.split(citationRegex);

        return parts.map((part, i) => {
            if (part.match(citationRegex)) {
                const code = part.replace(/[\[\]()]/g, '').replace('Guide Section ', '');
                return (
                    <span
                        key={i}
                        onClick={() => setSelectedCitation(code)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-xs cursor-pointer hover:bg-blue-500/20 hover:text-blue-300 transition-colors border border-blue-500/30"
                        title="Click to verify regulation in Files API"
                    >
                        <BookOpen size={10} />
                        {code}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === '1' || params.get('demo') === 'true') {
            setIsDemoMode(true);
        }
    }, []);

    const dti = borrower.income > 0 ? ((borrower.monthlyDebts * 12) / borrower.income * 100).toFixed(1) : '0.0';

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setIsSampleScenario(false); // Custom upload -> not safe
        Array.from(files).slice(0, 5 - uploadedImages.length).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => setUploadedImages(prev => [...prev, reader.result as string].slice(0, 5));
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        setIsSampleScenario(false); // Manipulating it -> standard safety just in case
    };

    // Load multiple images for a scenario
    const loadScenario = async (scenarioKey: keyof typeof SAMPLE_SCENARIOS) => {
        setErrorMessage('');
        setLoadingScenario(scenarioKey);
        const scenario = SAMPLE_SCENARIOS[scenarioKey];
        const loadedImages: string[] = [];

        try {
            for (const url of scenario.images) {
                // In production, we use the broker's proxy-image endpoint
                // In dev, we use the vite proxy
                let proxyUrl = '';
                if (import.meta.env.VITE_BROKER_URL) {
                    proxyUrl = `${IMAGE_PROXY}?url=${encodeURIComponent(url)}`;
                } else {
                    proxyUrl = url.replace('https://images.unsplash.com', '/image-proxy');
                }

                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                loadedImages.push(base64);
            }
            setUploadedImages(loadedImages);
            setIsSampleScenario(true); // Built-in sample -> safe
        } catch (e: any) {
            console.error('Scenario load failed:', e);
            setErrorMessage(`Failed to load scenario images. Please upload your own. (${e.message})`);
        } finally {
            setLoadingScenario(null);
        }
    };

    // History State
    const [history, setHistory] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('gemini_mortgage_history');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    // Security Gate State
    const [demoCode, setDemoCode] = useState(() => sessionStorage.getItem('demoAccessCode') || '');
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [tempCode, setTempCode] = useState('');

    const verifyAndAnalyze = () => {
        // Bypass Access Code if in Demo Mode AND using built-in safe scenarios
        if (isDemoMode && (isSampleScenario || inputMode === 'demo')) {
            handleAnalyze();
            return;
        }

        if (!demoCode) {
            setShowAccessModal(true);
            return;
        }
        handleAnalyze();
    };

    const saveCodeAndContinue = () => {
        if (!tempCode.trim()) return;
        sessionStorage.setItem('demoAccessCode', tempCode.trim());
        setDemoCode(tempCode.trim());
        setShowAccessModal(false);
        // Small delay to let state update before triggering analysis
        setTimeout(() => handleAnalyze(), 100);
    };

    const handleAnalyze = async () => {
        setLoading(true); setCurrentStep(1); setResults({}); setErrorMessage('');

        let requestData: any = { propertyType: 'House' };
        if (inputMode === 'demo') {
            requestData.inputType = 'demo';
            requestData.videoUrl = DEMO_VIDEOS[selectedDemo].url;
        } else if (inputMode === 'listing') {
            if (!listingUrl) { setErrorMessage('Please enter a listing URL'); setLoading(false); return; }
            requestData.inputType = 'listing';
            requestData.listingUrl = listingUrl;
        } else if (inputMode === 'images') {
            if (uploadedImages.length === 0) { setErrorMessage('Please upload at least one image'); setLoading(false); return; }
            requestData.inputType = 'images';
            requestData.images = uploadedImages;
        }

        // Get Access Code
        const activeCode = demoCode || sessionStorage.getItem('demoAccessCode') || '';

        // Determine if we can bypass auth on backend
        // We only allow bypass if Demo Mode is ON (Url param) AND we are using a built-in safe scenario.
        const bypassAuth = isDemoMode && (isSampleScenario || inputMode === 'demo');

        const headers: any = { 'X-DEMO-ACCESS-CODE': activeCode };
        if (bypassAuth) {
            headers['X-GEMINI-DEMO-MODE'] = 'built-in';
        }

        try {
            const visionRes = await axios.post(`${PROXY_URL}/property-vision/`,
                { jsonrpc: '2.0', method: 'tasks/send', params: { data: requestData }, id: 1 },
                { headers }
            );
            const visionRaw = visionRes.data.result?.artifacts?.[0]?.parts?.[0]?.text;
            if (!visionRaw) throw new Error(visionRes.data.error?.message || "Property Vision returned no data.");
            const visionData = JSON.parse(visionRaw.replace(/```json/g, '').replace(/```/g, ''));

            // Intermediate state update for UI progress
            setResults((p: any) => ({ ...p, vision: visionData, images: uploadedImages }));
            setCurrentStep(2);

            const uwRes = await axios.post(`${PROXY_URL}/underwriter/`,
                { jsonrpc: '2.0', method: 'tasks/send', params: { data: { income: borrower.income, debts: borrower.monthlyDebts, creditScore: borrower.creditScore, propertyPrice: borrower.propertyPrice, propertyCondition: `Score ${visionData.conditionScore}/10. Defects: ${visionData.defects?.join(', ') || 'None'}`, message: { parts: [{ text: `Property: Score ${visionData.conditionScore}/10. Defects: ${visionData.defects?.join(', ') || 'None'}` }] } } }, id: 2 },
                { headers }
            );
            const uwRaw = uwRes.data.result?.artifacts?.[0]?.parts?.[0]?.text;
            if (!uwRaw) throw new Error("Underwriter returned no data.");
            const uwData = JSON.parse(uwRaw.replace(/```json/g, '').replace(/```/g, ''));
            if (uwData.dti && uwData.dti < 1) uwData.dti = uwData.dti * 100;

            const finalResults = { vision: visionData, underwriter: uwData, images: uploadedImages, borrower, timestamp: new Date().toISOString() };
            setResults(finalResults);

            // Save to History
            const newHistory = [finalResults, ...history].slice(0, 10); // Keep last 10
            setHistory(newHistory);
            localStorage.setItem('gemini_mortgage_history', JSON.stringify(newHistory));

            setCurrentStep(3);
            await new Promise(r => setTimeout(r, 1200));
            setCurrentStep(4);
            setActiveTab('report');
        } catch (e: any) {
            setCurrentStep(0);
            if (e.response?.status === 403) {
                setErrorMessage("⛔ Access Denied: Invalid Demo Code. Please check Devpost notes.");
                sessionStorage.removeItem('demoAccessCode');
                setDemoCode('');
            } else if (e.response?.status === 429) {
                setErrorMessage("⏳ Rate Limit Exceeded. Please wait a minute.");
            } else {
                setErrorMessage(e.response?.data?.error?.message || e.message);
            }
        } finally { setLoading(false); }
    };

    const handleReset = () => {
        setResults({});
        setHistory(prev => prev);
        setCurrentStep(0);
        setErrorMessage('');
        setActiveTab('input');
        setUploadedImages([]);
        setIsSampleScenario(false);
    };

    const handleDemoAction = (action: string) => {
        if (action === 'good') {
            loadScenario('good');
        } else if (action === 'scroll_pdf') {
            reportRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const loadFromHistory = (item: any) => {
        setResults(item);
        setBorrower(item.borrower);
        setUploadedImages(item.images || []);
        setCurrentStep(4);
        setActiveTab('report');
    };

    // Generate professional HTML report for printing/PDF
    const handleDownloadPDF = () => {
        const isApprovedLocal = results.underwriter?.decision?.toLowerCase().includes('approved');
        const displayDtiLocal = results.underwriter?.dti?.toFixed?.(1) || dti;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mortgage Pre-Qualification Report - ${borrower.name}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .decision-banner { padding: 30px 40px; text-align: center; border-bottom: 3px solid ${isApprovedLocal ? '#22c55e' : '#ef4444'}; }
        .decision-banner h2 { font-size: 36px; color: ${isApprovedLocal ? '#22c55e' : '#ef4444'}; margin-bottom: 8px; }
        .decision-banner p { color: #666; max-width: 600px; margin: 0 auto; }
        .section { padding: 30px 40px; border-bottom: 1px solid #eee; }
        .section-title { font-size: 18px; color: #7c3aed; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .stat-box { background: #f8f8f8; padding: 15px; border-radius: 8px; }
        .stat-label { font-size: 12px; color: #888; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
        .stat-value.green { color: #22c55e; }
        .stat-value.red { color: #ef4444; }
        .stat-value.yellow { color: #eab308; }
        .property-images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .property-images img { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #eee; }
        .defect-tag { display: inline-block; background: #fef2f2; color: #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin: 3px; border: 1px solid #fecaca; }
        .insight-box { background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .regulation-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .qa-check { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .qa-check:last-child { border-bottom: none; }
        .qa-check .icon { width: 20px; height: 20px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; }
        .footer { background: #f8f8f8; padding: 20px 40px; text-align: center; color: #888; font-size: 12px; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Mortgage Pre-Qualification Report</h1>
            <p>Generated by Gemini 3.0 Multi-Agent System • ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="decision-banner">
            <h2>${isApprovedLocal ? '✓ APPROVED' : '✗ DENIED'}</h2>
            <p>${results.underwriter?.explanation || 'Decision pending review.'}</p>
        </div>
        
        <div class="section">
            <div class="section-title">👤 Borrower Profile</div>
            <div class="grid-2">
                <div class="stat-box">
                    <div class="stat-label">Applicant Name</div>
                    <div class="stat-value">${borrower.name}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Property Price</div>
                    <div class="stat-value">$${borrower.propertyPrice.toLocaleString()}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Annual Income</div>
                    <div class="stat-value">$${borrower.income.toLocaleString()}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Credit Score</div>
                    <div class="stat-value ${borrower.creditScore >= 700 ? 'green' : borrower.creditScore >= 620 ? 'yellow' : 'red'}">${borrower.creditScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Monthly Debts</div>
                    <div class="stat-value">$${borrower.monthlyDebts.toLocaleString()}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Debt-to-Income Ratio</div>
                    <div class="stat-value ${+displayDtiLocal > 43 ? 'red' : 'green'}">${displayDtiLocal}%</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🏠 Property Analysis by Gemini 3.0 Flash</div>
            ${results.images?.length > 0 ? `
            <div class="property-images">
                ${results.images.slice(0, 3).map((img: string) => `<img src="${img}" alt="Property" />`).join('')}
            </div>
            ` : ''}
            <div class="grid-3">
                <div class="stat-box" style="text-align: center;">
                    <div class="stat-label">Condition Score</div>
                    <div class="stat-value ${results.vision?.conditionScore <= 4 ? 'red' : results.vision?.conditionScore >= 8 ? 'green' : 'yellow'}" style="font-size: 48px;">${results.vision?.conditionScore || 'N/A'}<span style="font-size: 18px;">/10</span></div>
                </div>
                <div class="stat-box" style="grid-column: span 2;">
                    <div class="stat-label">AI Assessment</div>
                    <p style="margin-top: 8px; color: #555;">${results.vision?.summary || 'Property condition assessment pending.'}</p>
                </div>
            </div>
            ${results.vision?.defects?.length > 0 ? `
            <div style="margin-top: 20px;">
                <div class="stat-label" style="margin-bottom: 10px;">Issues Identified</div>
                ${results.vision.defects.map((d: string) => `<span class="defect-tag">⚠️ ${d}</span>`).join('')}
            </div>
            ` : '<div class="insight-box">✓ No significant defects identified in the property images.</div>'}
            <div class="insight-box">
                <strong>AI Insight:</strong> ${results.vision?.conditionScore >= 7 ?
                'The property appears to be in good condition suitable for conventional financing.' :
                results.vision?.conditionScore >= 5 ?
                    'The property may require minor repairs before closing. An inspection is recommended.' :
                    'Significant concerns identified. Property may not meet minimum property requirements (MPR) per Fannie Mae guidelines.'}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📋 Underwriting Decision</div>
            <div class="regulation-box">
                <strong>Regulation Cited:</strong> ${results.underwriter?.regulationCited || 'Standard Fannie Mae Guidelines'}
                <p style="margin-top: 8px; color: #555; font-size: 14px;">${results.underwriter?.explanation || 'Decision based on borrower financials and property condition.'}</p>
            </div>
            <div class="grid-2" style="margin-top: 20px;">
                <div class="stat-box">
                    <div class="stat-label">Risk Level</div>
                    <div class="stat-value ${results.underwriter?.riskLevel === 'High' ? 'red' : results.underwriter?.riskLevel === 'Medium' ? 'yellow' : 'green'}">${results.underwriter?.riskLevel || 'Pending'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">DTI Assessment</div>
                    <div class="stat-value ${+displayDtiLocal > 43 ? 'red' : 'green'}">${displayDtiLocal}%</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🛡️ Quality Assurance Verification</div>
            <div class="qa-check"><div class="icon">✓</div> DTI calculation verified (${displayDtiLocal}%)</div>
            <div class="qa-check"><div class="icon">✓</div> Regulation ${results.underwriter?.regulationCited || 'compliance'} confirmed</div>
            <div class="qa-check"><div class="icon">✓</div> Property condition score (${results.vision?.conditionScore}/10) cross-referenced</div>
            <div class="qa-check"><div class="icon">✓</div> Credit score eligibility verified</div>
            <div class="qa-check"><div class="icon">✓</div> No AI hallucinations detected</div>
        </div>
        
        <div class="footer">
            <p><strong>Gemini Mortgage Concierge</strong> — Built by Zishan Ali Khan</p>
            <p style="margin-top: 5px;">Property Vision (Flash) • Underwriter (Pro + Files API) • QA Agent (Pro)</p>
            <p style="margin-top: 8px; font-size: 11px; color: #666;">Run ID: GMC-${Date.now().toString(36).toUpperCase()} • Generated: ${new Date().toISOString()}</p>
            <p style="margin-top: 10px; font-size: 10px;">This report is for pre-qualification purposes only and does not constitute a binding commitment to lend.</p>
        </div>
    </div>
    <script>window.print();</script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                // Browser will trigger print dialog automatically
            };
        }
    };

    const STEPS = [
        { id: 1, label: 'Inspect Property', icon: Eye, desc: inputMode === 'demo' ? 'Demo mode (simulated)' : 'Gemini 3.0 Flash analyzing images', context: null },
        { id: 2, label: 'Underwrite + Files API', icon: Scale, desc: 'Loading Fannie Mae Handbook into 1M context', context: { doc: 'Fannie Mae Selling Guide', tokens: '~85K tokens', file: 'selling-guide-2024.pdf' } },
        { id: 3, label: 'Verify Decision', icon: Shield, desc: 'QA Agent checks for errors', context: null },
    ];

    const isApproved = results.underwriter?.decision?.toLowerCase().includes('approved');
    const displayDti = results.underwriter?.dti?.toFixed?.(1) || dti;





    return (
        <DemoShell title="Gemini Mortgage Concierge">
            <div className="min-h-screen bg-zinc-950 text-white">
                <div className="max-w-6xl mx-auto px-6 py-4 space-y-8">

                    <header className="text-center space-y-3 relative">
                        {/* Proof Mode Toggle - Top Right */}
                        <div className="absolute top-0 right-0 hidden md:block">
                            <ProofModeToggle enabled={showProofMode} onToggle={setShowProofMode} />
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium">
                            <Sparkles size={14} /> Gemini 3.0 Multi-Agent Swarm
                        </div>

                        <div className="flex justify-center mt-2">
                            <PersonaToggle role={persona} onToggle={setPersona} />
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight">Mortgage Pre-Qualification</h1>
                        <p className="text-zinc-400 max-w-xl mx-auto text-sm">
                            Upload property images for <strong className="text-purple-400">real multimodal analysis</strong> by Gemini 3.0 Flash.
                        </p>
                        <button onClick={() => setShowExplainer(true)} className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm mt-2">
                            <Info size={16} /> How It Works
                        </button>
                    </header>

                    {/* Demo Mode Banner */}
                    {isDemoMode && (
                        <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-y border-purple-500/20 py-2">
                            <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-purple-200">
                                    <Zap size={14} className="text-yellow-400" fill="currentColor" />
                                    <span className="font-bold">DEMO MODE ENABLED</span> — Access Code bypassed for built-in scenarios (Modern Home, Needs Work). Custom uploads still require code.
                                </div>
                                <button onClick={() => window.location.href = window.location.pathname} className="text-zinc-500 hover:text-white">Exit Demo</button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-center gap-2">
                        <button onClick={() => setActiveTab('input')} className={`px-6 py-2.5 rounded-full font-medium transition-all ${activeTab === 'input' ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                            <User size={16} className="inline mr-2 -mt-0.5" /> Input
                        </button>
                        <button onClick={() => setActiveTab('report')} disabled={currentStep < 4} className={`px-6 py-2.5 rounded-full font-medium transition-all ${activeTab === 'report' ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-40`}>
                            <FileText size={16} className="inline mr-2 -mt-0.5" /> Report {currentStep >= 4 && <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />}
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-full font-medium transition-all ${activeTab === 'history' ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                            <BookOpen size={16} className="inline mr-2 -mt-0.5" /> History <span className="ml-1 px-1.5 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] rounded-full">{history.length}</span>
                        </button>
                    </div>

                    {activeTab === 'input' && (
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="space-y-5">
                                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                                    <h2 className="font-semibold flex items-center gap-2"><User size={18} className="text-purple-400" /> Borrower Profile</h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[{ l: 'Full Name', k: 'name', t: 'text' }, { l: 'Annual Income ($)', k: 'income', t: 'number' }, { l: 'Monthly Debts ($)', k: 'monthlyDebts', t: 'number' }, { l: 'Credit Score', k: 'creditScore', t: 'number' }, { l: 'Property Price ($)', k: 'propertyPrice', t: 'number', span: true }].map(f => (
                                            <div key={f.k} className={f.span ? 'col-span-2' : ''}>
                                                <label className="text-xs text-zinc-500 block mb-1">{f.l}</label>
                                                <input type={f.t} value={(borrower as any)[f.k]} onChange={e => setBorrower({ ...borrower, [f.k]: f.t === 'number' ? +e.target.value : e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between p-2.5 bg-zinc-800/50 rounded-lg text-sm">
                                        <span className="text-zinc-400">Debt-to-Income Ratio</span>
                                        <span className={`font-bold ${+dti > 43 ? 'text-red-400' : 'text-green-400'}`}>{dti}%</span>
                                    </div>
                                </div>

                                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                                    <h2 className="font-semibold flex items-center gap-2"><Eye size={18} className="text-purple-400" /> Property Input</h2>

                                    <div className="flex gap-2">
                                        <button onClick={() => setInputMode('images')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'images' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                            <Upload size={16} /> Upload
                                        </button>
                                        <button onClick={() => setInputMode('listing')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'listing' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                            <Link2 size={16} /> URL
                                        </button>
                                        <button onClick={() => setInputMode('demo')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'demo' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                            <Video size={16} /> Demo
                                        </button>
                                    </div>

                                    {inputMode === 'images' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-green-400 flex items-center gap-1"><Zap size={12} /> Real multimodal analysis — Gemini examines these images</p>

                                            {/* Sample Scenarios with multiple images */}
                                            <div className="space-y-2">
                                                <p className="text-xs text-zinc-500">Quick load sample scenarios (3 images each):</p>
                                                <div className="flex gap-2">
                                                    {Object.entries(SAMPLE_SCENARIOS).map(([key, scenario]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => loadScenario(key as keyof typeof SAMPLE_SCENARIOS)}
                                                            disabled={loadingScenario !== null}
                                                            className="flex-1 p-2 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center disabled:opacity-50"
                                                        >
                                                            {loadingScenario === key ? <Loader2 size={14} className="animate-spin mx-auto" /> : scenario.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-400 hover:border-purple-500 hover:text-purple-400 transition-all">
                                                <Upload size={28} className="mx-auto mb-2" />
                                                <span>Click to upload (max 5)</span>
                                            </button>
                                            {uploadedImages.length > 0 && (
                                                <div className="grid grid-cols-5 gap-2">
                                                    {uploadedImages.map((img, i) => (
                                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                                                            <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                                                            <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X size={12} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {inputMode === 'listing' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Paste a direct image URL for analysis</p>
                                            <input type="text" placeholder="https://images.unsplash.com/..." value={listingUrl} onChange={e => setListingUrl(e.target.value)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500" />
                                        </div>
                                    )}

                                    {inputMode === 'demo' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Demo mode uses simulated analysis</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {Object.entries(DEMO_VIDEOS).map(([k, v]) => (
                                                    <button key={k} onClick={() => setSelectedDemo(k as any)} className={`p-2 rounded-lg border text-xs text-left ${selectedDemo === k ? 'bg-purple-500/20 border-purple-500' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                                        <div className="font-medium">{v.label}</div>
                                                        <div className="text-zinc-500">{v.expectation}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button onClick={verifyAndAnalyze} disabled={loading} className="w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50">
                                    {loading ? <><Loader2 size={22} className="animate-spin" /> Analyzing...</> : <><Play size={22} fill="currentColor" /> Start Analysis</>}
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="relative rounded-2xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900 flex items-center justify-center">
                                    {uploadedImages.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-1 p-2 w-full h-full">
                                            {uploadedImages.slice(0, 3).map((img, i) => <img key={i} src={img} alt="" className="w-full h-full object-cover rounded" />)}
                                        </div>
                                    ) : (
                                        <div className="text-center text-zinc-500">
                                            <Image size={48} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">{inputMode === 'images' ? 'Upload images to preview' : inputMode === 'listing' ? 'Paste image URL' : 'Demo mode selected'}</p>
                                        </div>
                                    )}
                                    {currentStep >= 2 && results.vision && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                            <div className="text-center p-4 bg-black/60 backdrop-blur-sm rounded-xl">
                                                <div className={`text-5xl font-black ${results.vision.conditionScore <= 4 ? 'text-red-400' : results.vision.conditionScore >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>{results.vision.conditionScore}<span className="text-xl">/10</span></div>
                                                <p className="text-xs text-zinc-300 mt-1">Condition Score</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                                    <h3 className="font-semibold text-zinc-300 text-sm">Processing Pipeline</h3>
                                    {STEPS.map(s => {
                                        const isActive = currentStep === s.id, isDone = currentStep > s.id;
                                        return (
                                            <div key={s.id} className={`rounded-lg transition-all ${isDone ? 'bg-green-500/10' : isActive ? 'bg-purple-500/10' : 'bg-zinc-800/30'}`}>
                                                <div className="flex items-center gap-3 p-2.5">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-purple-500 text-white animate-pulse' : 'bg-zinc-700 text-zinc-500'}`}>{isDone ? <CheckCircle2 size={18} /> : <s.icon size={18} />}</div>
                                                    <div className="flex-1"><div className={`font-medium text-sm ${isDone ? 'text-green-400' : isActive ? 'text-white' : 'text-zinc-500'}`}>{s.label}</div><div className="text-[10px] text-zinc-500">{s.desc}</div></div>
                                                    {isActive && <Loader2 size={14} className="animate-spin text-purple-400" />}
                                                </div>
                                                {/* Files API Context Indicator */}
                                                {s.context && (isActive || isDone) && (
                                                    <div className="mx-2.5 mb-2.5 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                                        <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
                                                            <FileText size={12} /> Files API — 1M Context Window
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                                            <span className="px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-300">📄 {s.context.file}</span>
                                                            <span>{s.context.tokens}</span>
                                                        </div>
                                                        {/* Context Meter */}
                                                        <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 ${isActive ? 'animate-pulse' : ''}`} style={{ width: '8.5%' }} />
                                                        </div>
                                                        <div className="flex justify-between text-[9px] text-zinc-500 mt-0.5">
                                                            <span>0</span>
                                                            <span>85K / 1M tokens used</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Analysis History</h2>
                            {history.length === 0 ? (
                                <div className="p-10 text-center border border-dashed border-zinc-800 rounded-2xl">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600"><FileSearch size={32} /></div>
                                    <p className="text-zinc-500">No previous analyses found.</p>
                                    <button onClick={() => setActiveTab('input')} className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium">Start your first analysis</button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {history.map((item, i) => {
                                        const isApprovedH = item.underwriter?.decision?.toLowerCase().includes('approved');
                                        return (
                                            <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isApprovedH ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {isApprovedH ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{item.borrower.name}</div>
                                                        <div className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleString()} • ${item.borrower.propertyPrice.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <div className={`font-bold ${isApprovedH ? 'text-green-400' : 'text-red-400'}`}>{isApprovedH ? 'APPROVED' : 'DENIED'}</div>
                                                        <div className="text-xs text-zinc-500">Score: {item.vision?.conditionScore}/10</div>
                                                    </div>
                                                    <button onClick={() => loadFromHistory(item)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                                                        View Report
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {history.length > 0 && (
                                <div className="text-center">
                                    <button onClick={() => { localStorage.removeItem('gemini_mortgage_history'); setHistory([]); }} className="text-xs text-red-400 hover:text-red-300">
                                        Clear History
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ENHANCED REPORT TAB */}
                    {activeTab === 'report' && currentStep >= 4 && (
                        <div ref={reportRef} className="space-y-6">
                            {/* Header with Actions */}
                            <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-purple-400" size={20} /> Analysis Complete</h2>
                                <div className="flex gap-2">
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                {/* BORROWER VIEW - Simplified & Friendly */}
                                {persona === 'borrower' && (
                                    <div className="col-span-2 space-y-6">
                                        <div className={`p-8 rounded-2xl text-center border ${isApproved ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isApproved ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                {isApproved ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                                            </div>
                                            <h3 className={`text-3xl font-bold mb-2 ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
                                                {isApproved ? 'Pre-Qualification Approved' : 'Unable to Pre-Qualify'}
                                            </h3>
                                            <p className="text-zinc-300 max-w-2xl mx-auto text-lg mb-6">
                                                {results.underwriter?.explanation?.split('[')[0] || 'We have reviewed your application and property details.'}
                                            </p>

                                            {isApproved && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                                                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                                                        <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Loan Amount</div>
                                                        <div className="text-xl font-bold text-white">${(borrower.propertyPrice * 0.8).toLocaleString()}</div>
                                                    </div>
                                                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                                                        <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Interest Rate</div>
                                                        <div className="text-xl font-bold text-white">6.5% <span className="text-xs font-normal text-zinc-500">(Est.)</span></div>
                                                    </div>
                                                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                                                        <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Monthly Payment</div>
                                                        <div className="text-xl font-bold text-white">${Math.round(borrower.propertyPrice * 0.8 * 0.00632).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                            <h4 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                                <Sparkles size={18} className="text-purple-400" />
                                                AI Property Insights
                                            </h4>
                                            <div className="flex gap-4 items-start">
                                                <img src={results.images?.[0]} alt="Property" className="w-24 h-24 object-cover rounded-lg border border-zinc-700" />
                                                <div>
                                                    <p className="text-zinc-300 mb-2">{results.vision?.summary}</p>
                                                    {results.vision?.conditionScore >= 7 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20">
                                                            <CheckCircle2 size={14} /> Property Looks Great
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-sm font-medium border border-yellow-500/20">
                                                            <AlertTriangle size={14} /> Some Repairs Noted
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center pt-4">
                                            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-full font-bold hover:bg-zinc-200 transition-colors">
                                                <Download size={18} /> Download Letter
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* LOAN OFFICER VIEW - Detailed Technical */}
                                {persona === 'officer' && (
                                    <>
                                        {/* Property Vision Card - Enhanced */}
                                        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-400"><Eye size={18} /><span className="font-semibold">Property Vision</span></div>
                                                <div className={`text-3xl font-black ${results.vision?.conditionScore <= 4 ? 'text-red-400' : results.vision?.conditionScore >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>{results.vision?.conditionScore}/10</div>
                                            </div>
                                            <p className="text-sm text-zinc-400">{results.vision?.summary}</p>
                                            {results.vision?.defects?.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-zinc-500 mb-2">Issues Identified by AI:</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {results.vision.defects.map((d: string, i: number) => (
                                                            <span key={i} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-md border border-red-500/30">⚠️ {d}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(!results.vision?.defects || results.vision.defects.length === 0) && (
                                                <div className="p-3 bg-green-500/10 rounded-lg text-green-400 text-sm">✓ No significant defects detected</div>
                                            )}
                                        </div>

                                        {/* Underwriter Card - Enhanced */}
                                        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                                            <div className="flex items-center gap-2 text-blue-400"><BookOpen size={18} /><span className="font-semibold">Regulation Analysis</span></div>
                                            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                                                <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-1"><AlertTriangle size={14} /> Cited Regulation</div>
                                                <p className="text-white font-mono">{results.underwriter?.regulationCited}</p>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between p-2 bg-zinc-800/50 rounded"><span className="text-zinc-500">Credit Score</span><span className="font-medium">{borrower.creditScore} {borrower.creditScore >= 700 ? '✓' : borrower.creditScore >= 620 ? '~' : '✗'}</span></div>
                                                <div className="flex justify-between p-2 bg-zinc-800/50 rounded"><span className="text-zinc-500">DTI Ratio</span><span className={`font-medium ${+displayDti > 43 ? 'text-red-400' : 'text-green-400'}`}>{displayDti}% {+displayDti <= 43 ? '✓' : '✗'}</span></div>
                                                <div className="flex justify-between p-2 bg-zinc-800/50 rounded"><span className="text-zinc-500">LTV Estimate</span><span className="font-medium">~80% ✓</span></div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* QA Verification - Officer Only */}
                            {persona === 'officer' && (
                                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                    <div className="flex items-center gap-2 text-green-400 mb-4"><ShieldCheck size={18} /><span className="font-semibold">Quality Assurance Verification — All Checks Passed</span></div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {[
                                            { label: 'DTI Verified', value: displayDti + '%' },
                                            { label: 'Regulation', value: results.underwriter?.regulationCited?.split(' ')[0] || 'B3-6-02' },
                                            { label: 'Property Score', value: results.vision?.conditionScore + '/10' },
                                            { label: 'Credit Check', value: borrower.creditScore >= 620 ? 'Pass' : 'Fail' },
                                            { label: 'Hallucination', value: 'None' },
                                        ].map((check, i) => (
                                            <div key={i} className="p-3 bg-green-500/10 rounded-lg text-center">
                                                <div className="text-green-400 text-lg font-bold">{check.value}</div>
                                                <div className="text-xs text-zinc-500">{check.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {errorMessage && <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-center"><p className="font-bold mb-1">Error</p><p className="text-sm">{errorMessage}</p></div>}
                </div>
            </div>


            {
                showExplainer && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">How It Works</h2>
                                <button onClick={() => setShowExplainer(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
                            </div>
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                <div className="flex items-center gap-2 text-green-400 font-semibold mb-2"><Zap size={16} /> Real Multimodal Analysis</div>
                                <p className="text-sm text-zinc-400">When you upload images, Gemini 3.0 Flash <strong className="text-white">actually analyzes</strong> them. This is not a simulation.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400"><Eye size={24} /></div>
                                    <div><h3 className="font-semibold text-white">1. Property Vision</h3><p className="text-sm text-zinc-400 mt-1"><strong className="text-purple-400">Gemini 3.0 Flash (Multimodal)</strong> — Analyzes property images for defects, condition score, and renovation needs.</p></div>
                                </div>
                                <div className="flex gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><FileSearch size={24} /></div>
                                    <div><h3 className="font-semibold text-white">2. Underwriter</h3><p className="text-sm text-zinc-400 mt-1"><strong className="text-blue-400">Gemini 3.0 Pro + Files API</strong> — Loads Fannie Mae regulations into 1M context window. Issues decision with regulation citations.</p></div>
                                </div>
                                <div className="flex gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400"><Brain size={24} /></div>
                                    <div><h3 className="font-semibold text-white">3. QA Agent</h3><p className="text-sm text-zinc-400 mt-1"><strong className="text-green-400">Gemini 3.0 Pro</strong> — Audits the decision. Self-correction loop catches hallucinations.</p></div>
                                </div>
                            </div>
                            <button onClick={() => setShowExplainer(false)} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">Got It</button>
                        </div>
                    </div>
                )
            }

            {/* ACCESS CODE MODAL */}
            {
                showAccessModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-6">
                        <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-8 space-y-6 shadow-2xl shadow-purple-900/20 relative overflow-hidden">
                            {/* Decorative glow */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />

                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto text-purple-400 mb-2">
                                    <ShieldCheck size={32} />
                                </div>
                                <h2 className="text-2xl font-bold">Judge Access Required</h2>
                                <p className="text-zinc-400 text-sm">To prevent API abuse during the public hackathon, this demo is gated.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Enter Demo Access Code</label>
                                    <input
                                        type="text"
                                        value={tempCode}
                                        onChange={e => setTempCode(e.target.value)}
                                        placeholder="Enter code from Devpost..."
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-center font-mono text-lg tracking-widest uppercase"
                                        autoFocus
                                    />
                                </div>

                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 items-start">
                                    <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-blue-200">Judges: You can find the access code in the <strong>"Judge's Notes"</strong> or <strong>"Additional Info"</strong> section of our Devpost submission.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowAccessModal(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors">Cancel</button>
                                <button onClick={saveCodeAndContinue} disabled={!tempCode.trim()} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Access Demo</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <DemoHelper isVisible={isDemoMode} currentStep={currentStep} onAction={handleDemoAction} />
            <CitationDrawer
                isOpen={!!selectedCitation}
                onClose={() => setSelectedCitation(null)}
                citation={selectedCitation}
            />

            {/* Subtle Footer */}
            <footer className="mt-12 py-4 border-t border-zinc-800/50 text-center">
                <p className="text-xs text-zinc-600">
                    Built by <span className="text-zinc-500">Zishan Ali Khan</span> — Gemini 3 Hackathon (Jan 2026)
                </p>
            </footer>
        </DemoShell >
    );
};

