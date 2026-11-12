'use client';

import { Suspense } from 'react';
import ProformaEditor from '../_components/ProformaEditor';

export default function NouvelleProformaPage() {
  return (
    <Suspense fallback={null}>
      <ProformaEditor mode="create" />
    </Suspense>
  );
}
