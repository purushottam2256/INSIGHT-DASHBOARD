import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FileSpreadsheet, Megaphone, CalendarPlus, CheckCheck, 
    Zap, ChevronRight, X 
} from 'lucide-react';

interface QuickActionsProps {
    pendingLeavesCount: number;
    onApproveAll?: () => void;
}

export function QuickActions({ pendingLeavesCount, onApproveAll }: QuickActionsProps) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);

    const actions = [
        {
            label: 'Reports',
            icon: FileSpreadsheet,
            color: 'from-blue-500 to-blue-600',
            shadow: 'shadow-blue-500/20',
            onClick: () => navigate('/reports'),
            desc: 'Generate attendance report',
        },
        {
            label: 'Broadcast',
            icon: Megaphone,
            color: 'from-primary to-amber-500',
            shadow: 'shadow-primary/20',
            onClick: () => { /* Opens notification center — handled via bell icon */ },
            desc: 'Send message to all faculty',
        },
        {
            label: 'Add Event',
            icon: CalendarPlus,
            color: 'from-emerald-500 to-emerald-600',
            shadow: 'shadow-emerald-500/20',
            onClick: () => navigate('/settings'),
            desc: 'Add holiday or event',
        },
        ...(pendingLeavesCount > 0 ? [{
            label: `Approve All (${pendingLeavesCount})`,
            icon: CheckCheck,
            color: 'from-violet-500 to-violet-600',
            shadow: 'shadow-violet-500/20',
            onClick: () => onApproveAll?.(),
            desc: 'Approve all pending leaves',
        }] : []),
    ];

    return (
        <div className="relative">
            {/* Floating trigger */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold 
                    transition-all duration-300 
                    ${expanded 
                        ? 'bg-card border-2 border-primary/30 text-foreground shadow-xl shadow-primary/10' 
                        : 'bg-gradient-to-r from-primary to-amber-500 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02]'
                    }`}
            >
                {expanded ? (
                    <>
                        <X className="h-4 w-4" />
                        Close
                    </>
                ) : (
                    <>
                        <Zap className="h-4 w-4" />
                        Quick Actions
                        <ChevronRight className="h-3 w-3" />
                    </>
                )}
            </button>

            {/* Actions panel */}
            {expanded && (
                <div className="absolute left-0 top-full mt-2 z-50 animate-fade-in-scale">
                    <div className="flex gap-2 p-2 bg-card border-2 border-border rounded-2xl shadow-2xl shadow-black/10">
                        {actions.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={i}
                                    onClick={() => { action.onClick(); setExpanded(false); }}
                                    className={`group flex flex-col items-center gap-2 p-3 rounded-xl 
                                        bg-gradient-to-br ${action.color} text-white 
                                        shadow-lg ${action.shadow}
                                        hover:scale-105 active:scale-95 transition-all duration-200
                                        min-w-[90px]`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-[10px] font-bold whitespace-nowrap">{action.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
