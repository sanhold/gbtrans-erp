const base = { 'aria-hidden': true, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconUp = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M5 15l7-7 7 7" /></svg>;
export const IconDown = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M19 9l-7 7-7-7" /></svg>;
export const IconClose = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M6 18L18 6M6 6l12 12" /></svg>;
export const IconCheck = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M5 13l4 4L19 7" /></svg>;
export const IconPlus = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMinus = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M5 12h14" /></svg>;
export const IconTrash = ({ className = 'w-4 h-4' }: { className?: string }) => <svg {...base} className={className}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
export const IconBack = ({ className = 'w-5 h-5' }: { className?: string }) => <svg {...base} className={className}><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
