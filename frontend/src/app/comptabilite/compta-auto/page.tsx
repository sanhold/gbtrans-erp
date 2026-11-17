import { redirect } from 'next/navigation';
import { BASE_AUTO, ONGLETS_AUTO } from '@/lib/comptaOnglets';

export default function Page() {
  redirect(`${BASE_AUTO}/${ONGLETS_AUTO[0].slug}`);
}
