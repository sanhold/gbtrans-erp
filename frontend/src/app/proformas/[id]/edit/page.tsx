'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ProformaEditor from '../../_components/ProformaEditor';

export default function ModifierProformaPage() {
  const params = useParams();
  return (
    <Suspense fallback={null}>
      <ProformaEditor mode="edit" proformaId={params.id as string} />
    </Suspense>
  );
}
