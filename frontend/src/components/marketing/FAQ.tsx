'use client';

import { useState } from 'react';
import Reveal from './Reveal';

export default function FAQ({ faqs }: { faqs: { q: string; r: string }[] }) {
  const [ouvert, setOuvert] = useState<number | null>(0);
  return (
    <section id="faq" className="max-w-3xl mx-auto px-5 py-20 scroll-mt-16">
      <Reveal><h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white text-center mb-10">Questions fréquentes</h2></Reveal>
      <div className="space-y-3">
        {faqs.map((f, i) => {
          const est = ouvert === i;
          return (
            <div key={f.q} className="card !p-0 overflow-hidden">
              <h3>
                <button
                  type="button"
                  aria-expanded={est}
                  aria-controls={`faq-${i}`}
                  id={`faq-btn-${i}`}
                  onClick={() => setOuvert(est ? null : i)}
                  className="w-full min-h-[56px] flex items-center justify-between gap-4 px-5 py-3 text-left font-semibold text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
                  {f.q}
                  <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${est ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </h3>
              <div id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className={`grid transition-all duration-300 ease-out ${est ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden"><p className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.r}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
