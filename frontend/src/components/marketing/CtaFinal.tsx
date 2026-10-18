import Link from 'next/link';
import Reveal from './Reveal';

export default function CtaFinal() {
  return (
    <section className="max-w-4xl mx-auto px-5 pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-center py-14 px-6">
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-accent-500/25 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Prêt à moderniser votre bureau de transit ?</h2>
            <p className="text-white/85 mt-3 mb-8">14 jours d&apos;essai gratuit, sans engagement.</p>
            <Link href="/inscription" className="inline-flex items-center justify-center min-h-[48px] bg-white text-primary-700 font-semibold px-8 rounded-lg text-sm hover:bg-gray-100 hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700">
              Créer mon compte gratuitement
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
