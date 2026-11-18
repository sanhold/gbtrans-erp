'use client';

import { useParams } from 'next/navigation';
import WorkspaceCompta from '@/components/comptabilite/WorkspaceCompta';
import { ONGLETS_REEL } from '@/lib/comptaOnglets';

export default function ComptaOngletPage() {
  const { onglet } = useParams<{ onglet: string }>();
  const def = ONGLETS_REEL.find(d => d.slug === onglet) || ONGLETS_REEL[0];
  return <WorkspaceCompta source="REEL" onglet={def.onglet} />;
}
