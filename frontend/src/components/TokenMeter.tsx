import React from 'react';
import { Database, Info } from 'lucide-react';

interface TokenMeterProps {
    usedTokens: number;
    totalTokens?: number;
    label?: string;
    showTooltip?: boolean;
}

export const TokenMeter: React.FC<TokenMeterProps> = ({
    usedTokens,
    totalTokens = 1000000,
    label = "Context Usage",
    showTooltip = false
}) => {
    const percentage = Math.min(100, Math.max(1, (usedTokens / totalTokens) * 100));

    // Format numbers (e.g., 85000 -> 85K)
    const formatNumber = (num: number) => {
        return num >= 1000000
            ? (num / 1000000).toFixed(1) + 'M'
            : num >= 1000
                ? (num / 1000).toFixed(0) + 'K'
                : num.toString();
    };

    return (
        <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-3 w-full">
            <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                    <Database size={12} />
                    {label}
                    {showTooltip && (
                        <div className="group relative ml-1">
                            <Info size={10} className="text-zinc-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 text-[10px] text-zinc-300 rounded border border-zinc-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                This meter shows the real token consumption of the Gemini 3.0 Pro model context window (1M tokens).
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-sm font-bold text-white font-mono">{formatNumber(usedTokens)} <span className="text-zinc-600 text-[10px]">/ {formatNumber(totalTokens)}</span></div>
                </div>
            </div>

            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                {/* Background markers for logarithmic scale visually or just segments */}
                <div className="absolute left-[25%] top-0 bottom-0 w-px bg-zinc-700/50" />
                <div className="absolute left-[50%] top-0 bottom-0 w-px bg-zinc-700/50" />
                <div className="absolute left-[75%] top-0 bottom-0 w-px bg-zinc-700/50" />

                {/* Fill bar */}
                <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-out relative group"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-white/50 animate-pulse" />
                </div>
            </div>

            <div className="flex justify-between mt-1 text-[9px] text-zinc-600 font-mono">
                <span>0</span>
                <span>{percentage.toFixed(1)}%</span>
                <span>1M</span>
            </div>
        </div>
    );
};
