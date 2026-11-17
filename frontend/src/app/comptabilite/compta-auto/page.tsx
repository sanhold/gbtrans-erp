'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MenuRubriqueCompta from '@/components/comptabilite/MenuRubriqueCompta';
import { BASE_AUTO, ONGLETS_AUTO } from '@/lib/comptaOnglets';

/** Téléphone : écran de cartes de la rubrique. Ordinateur : on ouvre directement la première page (le sous-menu est dans la barre latérale). */
export default function Page() {
  const router = useRouter();
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const grand = window.matchMedia('(min-width: 1024px)').matches;
    if (grand) router.replace(`${BASE_AUTO}/${ONGLETS_AUTO[0].slug}`);
    setMobile(!grand);
  }, [router]);
  if (!mobile) return null;
  return <MenuRubriqueCompta base={BASE_AUTO} defs={ONGLETS_AUTO} titre="Compta Auto" />;
}
