import { redirect } from 'next/navigation';
import { BASE_REEL, ONGLETS_REEL } from '@/lib/comptaOnglets';

export default function Page() {
  redirect(`${BASE_REEL}/${ONGLETS_REEL[0].slug}`);
}
