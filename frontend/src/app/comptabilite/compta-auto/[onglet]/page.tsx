'use client';

import { useParams } from 'next/navigation';
import WorkspaceCompta from '@/components/comptabilite/WorkspaceCompta';
import { ONGLETS_AUTO } from '@/lib/comptaOnglets';

export default function ComptaOngletPage() {
  const { onglet } = useParams<{ onglet: string }>();
  const def = ONGLETS_AUTO.find(d => d.slug === onglet) || ONGLETS_AUTO[0];
  return <WorkspaceCompta source="AUTO" onglet={def.onglet} />;
}
