import React from 'react';
import { User, Briefcase } from 'lucide-react';

interface PersonaToggleProps {
    role: 'borrower' | 'officer';
    onToggle: (role: 'borrower' | 'officer') => void;
}

export const PersonaToggle: React.FC<PersonaToggleProps> = ({ role, onToggle }) => {
    return (
        <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
            <button
                onClick={() => onToggle('borrower')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${role === 'borrower'
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <User size={14} />
                Borrower
            </button>
            <button
                onClick={() => onToggle('officer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${role === 'officer'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <Briefcase size={14} />
                Loan Officer
            </button>
        </div>
    );
};
