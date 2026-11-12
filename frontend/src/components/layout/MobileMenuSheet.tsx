'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import Sheet from '@/components/ui/Sheet';
import { useAuthStore } from '@/stores/authStore';
import { useNav, SETTINGS_ICON } from './navConfig';

/** Menu complet mobile ("Plus") : remplace l'ancien tiroir latéral. Chargé à la demande par BottomNav. */
export default function MobileMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { groups, isItemActive, badges, canSettings } = useNav();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (open) setDark(document.documentElement.classList.contains('dark'));
  }, [open]);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setDark(document.documentElement.classList.contains('dark'));
  };
  const handleLogout = async () => {
    onClose();
    await logout();
    router.push('/auth/login');
  };

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';
  const Ico = ({ d, className }: { d: string; className?: string }) => (
    <svg aria-hidden="true" className={clsx('w-6 h-6 flex-shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
  const row = 'flex items-center gap-3 w-full px-4 min-h-[52px] text-[15px] font-medium text-left active:bg-gray-100 dark:active:bg-surface-700 select-none';

  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Menu" zIndexClass="z-[65]" size="lg">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-2">
        <Link href="/mon-compte" onClick={onClose} className="flex items-center gap-3 px-4 py-3 active:bg-gray-100 dark:active:bg-surface-700">
          <span className="w-11 h-11 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">{initials}</span>
          <span className="min-w-0 leading-tight">
            <span className="block font-semibold truncate">{user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{user?.profil?.nom || user?.email}</span>
          </span>
          <svg aria-hidden="true" className="w-5 h-5 ml-auto text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>

        {groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="px-3 pt-2">
            <h3 className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">{group.title}</h3>
            <div className="grid grid-cols-3 gap-2">
              {group.items.map((item) => {
                const active = isItemActive(item.href);
                const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'relative flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 min-h-[76px] text-center text-[12px] leading-tight font-medium select-none transition-transform active:scale-[.97]',
                      active
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-white ring-1 ring-primary-200 dark:ring-primary-500/40'
                        : 'bg-gray-50 text-gray-800 dark:bg-surface-700/60 dark:text-gray-200'
                    )}
                  >
                    <Ico d={item.icon} className={active ? 'text-primary-600 dark:text-white' : 'text-gray-600 dark:text-gray-300'} />
                    <span className="line-clamp-2">{item.name}</span>
                    {!!badge && <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{badge > 99 ? '99+' : badge}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <div className="mt-3 border-t border-gray-200 dark:border-surface-700 pt-1">
          {canSettings && (
            <Link href="/parametres" onClick={onClose} className={row}>
              <Ico d={SETTINGS_ICON} className="text-gray-600 dark:text-gray-300 !w-5 !h-5" /> Paramètres
            </Link>
          )}
          <button type="button" onClick={toggleDark} className={row} aria-pressed={dark}>
            <Ico d={dark ? 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' : 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'} className="text-gray-600 dark:text-gray-300 !w-5 !h-5" />
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button type="button" onClick={handleLogout} className={clsx(row, 'text-red-600')}>
            <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className="!w-5 !h-5" /> Déconnexion
          </button>
        </div>
      </div>
    </Sheet>
  );
}
