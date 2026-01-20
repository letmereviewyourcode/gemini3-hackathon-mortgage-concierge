import React from 'react';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface ProofModeToggleProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export const ProofModeToggle: React.FC<ProofModeToggleProps> = ({ enabled, onToggle }) => {
    return (
        <button
            onClick={() => onToggle(!enabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${enabled
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                }`}
            title={enabled ? "Proof Mode: Detailed Technical Evidence" : "Proof Mode: Standard View"}
        >
            {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            {enabled ? 'PROOF MODE: ON' : 'PROOF MODE: OFF'}
        </button>
    );
};
