'use client';

export default function SplashLoader() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center gap-6 bg-surface-50 dark:bg-surface-900 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07] pointer-events-none">
        <svg className="w-full h-full text-primary-500" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="splash-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#splash-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-3xl bg-primary-500/20 animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-0 rounded-3xl border-2 border-primary-200 dark:border-primary-800 border-t-primary-500 animate-[spin_1.4s_linear_infinite]" />
          <div className="absolute inset-[6px] rounded-2xl bg-white dark:bg-surface-800 shadow-elevated flex items-center justify-center overflow-hidden">
            <img src="/brand/logo-icon.png" alt="GBTrans" className="w-10 h-10 object-contain" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <p className="font-display font-bold text-gray-900 dark:text-white tracking-tight text-sm">GBTRANS ERP</p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
