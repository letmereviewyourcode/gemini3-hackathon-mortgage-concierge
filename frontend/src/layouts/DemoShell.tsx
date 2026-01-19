import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

interface DemoShellProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export const DemoShell: React.FC<DemoShellProps> = ({
    title,
    children,
}) => {
    // Use title to set document title (fixes unused var and adds utility)
    useEffect(() => {
        document.title = `${title} | Automation Hub`;
    }, [title]);

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-primary)] overflow-hidden">
            {/* Minimal Header for Demos - Can be overridden or used as is */}
            {/* Note: Specific demos like AiAgentChat might have their own Header bar (ChatHeader), 
                so this Shell is primarily for layout structure and common meta-data. 
                If the child provides its own header, this top bar can be omitted or minimal.
                For consistency, we will just provide the container structure here. 
            */}

            {/* If we wanted a common back-to-hub bar, we could put it here, 
                but our Chat UI has it built-in. We'll leave the shell simple for now. 
            */}

            {children}
        </div>
    );
};

// Re-exporting a more opinionated header if future demos want standard navigation
export const DemoHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <header className="h-16 shrink-0 px-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-secondary)]">
                <Home size={20} />
            </Link>
            <div className="h-6 w-px bg-[var(--border-subtle)] mx-1" />
            <div>
                <h1 className="text-base font-semibold text-[var(--text-primary)]">{title}</h1>
                {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
            </div>
        </div>
    </header>
);
