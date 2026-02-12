import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Card } from './Card';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-rose-500/10',
            text: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-500/20',
            button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
        },
        warning: {
            bg: 'bg-amber-500/10',
            text: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-500/20',
            button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
        },
        info: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-500/20',
            button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
        }
    };

    const currentStyle = colors[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <Card className="max-w-md w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 p-8">
                <div className={`absolute top-0 left-0 w-full h-1.5 ${currentStyle.bg.replace('/10', '')}`} />

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-4 rounded-3xl ${currentStyle.bg} ${currentStyle.text} mb-6`}>
                        <AlertTriangle size={32} />
                    </div>

                    <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter brand-font mb-2">
                        {title}
                    </h3>

                    <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-10 px-4 text-sm">
                        {message}
                    </p>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-[var(--bg-deep)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-black rounded-2xl transition-all border border-[var(--border-subtle)] uppercase tracking-widest text-xs"
                        >
                            {cancelText.toUpperCase()}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-4 text-white font-black rounded-2xl transition-all shadow-lg uppercase tracking-widest text-xs ${currentStyle.button}`}
                        >
                            {confirmText.toUpperCase()}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
