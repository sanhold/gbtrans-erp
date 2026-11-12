'use client';

import { useState } from 'react';

/** Section de formulaire : repliable sur mobile (accordéon), toujours ouverte dès 768px. */
export default function FormSection({ title, icon, defaultOpen = false, badge, children }: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `sec-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="card" aria-labelledby={id}>
      <h3 id={id} className="text-lg font-semibold m-0">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="w-full min-h-[44px] flex items-center gap-2 text-left md:pointer-events-none md:cursor-default"
        >
          {icon}
          <span className="flex-1">{title}</span>
          {badge}
          <svg aria-hidden="true" className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </h3>
      <div id={`${id}-panel`} className={`mt-3 ${open ? '' : 'max-md:hidden'}`}>{children}</div>
    </section>
  );
}
