import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, CheckCircle2, PlayCircle, FileSearch, ShieldCheck } from 'lucide-react';

interface DemoHelperProps {
    isVisible: boolean;
    currentStep: number;
    onAction: (action: string) => void;
}

export const DemoHelper: React.FC<DemoHelperProps> = ({ isVisible, currentStep, onAction }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (!isVisible) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all border-2 border-indigo-400/30 animate-pulse"
                title="Open Demo Helper"
            >
                <HelpCircle size={24} />
            </button>
        );
    }

    const steps = [
        {
            id: 0,
            title: "Start the Demo",
            desc: "Select a scenario to begin analysis.",
            action: { label: "Load 'Modern Home'", code: 'good' }
        },
        {
            id: 1,
            title: "Analysis in Progress",
            desc: "Watch the 'Files API' loading indicator in the pipeline.",
            note: "Gemini is reading the 1,200 page PDF now."
        },
        {
            id: 2,
            title: "Review Results",
            desc: "Check the approved decision and cited regulations.",
            note: "Note the DTI calculation matches the formula."
        },
        {
            id: 4,
            title: "Verify & Export",
            desc: "Show the 'PDF Export' to demonstrate the final artifact.",
            action: { label: "Scroll to PDF", code: 'scroll_pdf' }
        }
    ];

    // Find active step based on parent state
    const activeStepIndex = currentStep === 0 ? 0 : currentStep < 4 ? 1 : 2;
    // If step 4 (report) is active, we might be in review (idx 2) or verify (idx 3)
    const displayStep = currentStep >= 4 ? steps[2] : steps[activeStepIndex];

    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-zinc-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-indigo-900/30 border-b border-indigo-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <HelpCircle size={18} className="text-indigo-400" />
                    <h3 className="font-bold text-white text-sm">Demo Companion</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>

            <div className="p-4 space-y-4">
                <div className="space-y-3">
                    {steps.map((s, i) => {
                        const isActive = (currentStep === 0 && i === 0) || (currentStep > 0 && currentStep < 4 && i === 1) || (currentStep >= 4 && i >= 2);
                        // Simplified active logic for the list view
                        return (
                            <div key={i} className={`flex gap-3 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${isActive ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xs font-bold ${isActive ? 'text-white' : 'text-zinc-500'}`}>{s.title}</h4>
                                    {isActive && (
                                        <div className="mt-1">
                                            <p className="text-xs text-zinc-400 leading-relaxed mb-2">{s.desc}</p>
                                            {s.note && <p className="text-[10px] text-indigo-300 bg-indigo-500/10 p-2 rounded border border-indigo-500/20">💡 {s.note}</p>}
                                            {s.action && (
                                                <button
                                                    onClick={() => onAction(s.action!.code)}
                                                    className="mt-2 text-[10px] flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-indigo-400 border border-zinc-700 transition-colors"
                                                >
                                                    <PlayCircle size={12} /> {s.action!.label}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
