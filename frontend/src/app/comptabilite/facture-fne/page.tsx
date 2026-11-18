'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MenuRubriqueCompta from '@/components/comptabilite/MenuRubriqueCompta';
import { BASE_FNE, ONGLETS_FNE } from '@/lib/comptaOnglets';

/** Téléphone : écran de cartes de la rubrique. Ordinateur : on ouvre directement la file « À décider » (sous-menu dans la barre latérale). */
export default function FactureFneComptabilitePage() {
  const router = useRouter();
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const grand = window.matchMedia('(min-width: 1024px)').matches;
    if (grand) router.replace(`${BASE_FNE}/${ONGLETS_FNE[0].slug}`);
    setMobile(!grand);
  }, [router]);
  if (!mobile) return null;
  return <MenuRubriqueCompta base={BASE_FNE} defs={ONGLETS_FNE} titre="Facture FNE Comptabilité" avecPlan={false} />;
}
