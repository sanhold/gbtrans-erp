'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { useNav, SETTINGS_ICON } from './navConfig';

const COLLAPSE_KEY = 'gbtrans.sidebar.collapsed';

/** Menu latéral du bureau (>=1024px) ; repliable en icônes seules, préférence mémorisée. Le mobile utilise BottomNav. */
export default function Sidebar() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { groups, isItemActive, badges, canSettings } = useNav();
  // Sidebar n'est rendue qu'après le chargement du profil (côté client) : lecture directe sans risque d'hydratation.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });

  const toggle = () => {
    setCollapsed((v) => {
      try { window.localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1'); } catch { /* stockage indisponible */ }
      return !v;
    });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const linkCls = (active: boolean) => clsx(
    'relative flex items-center rounded-lg text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[38px]',
    collapsed ? 'justify-center mx-2 px-0' : 'gap-3 mx-3 px-3',
    active
      ? 'bg-primary-50 dark:bg-primary-500/20 text-gray-950 dark:text-white font-bold shadow-[inset_3px_0_0_theme(colors.primary.600)]'
      : 'text-gray-950 font-medium dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700 dark:hover:text-white'
  );
  const titleCls = 'px-6 pt-4 pb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-400';
  const Icon = ({ d, active }: { d: string; active: boolean }) => (
    <svg aria-hidden="true" className={clsx('w-[18px] h-[18px] flex-shrink-0', active ? 'text-primary-600 dark:text-white' : 'text-gray-700 dark:text-gray-400')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-shrink-0 sticky top-14 h-[calc(100dvh-56px)] flex-col overflow-y-auto',
        'bg-white dark:bg-surface-800 border-r border-gray-200 dark:border-surface-700 text-gray-700 dark:text-gray-200',
        'transition-[width] duration-200 ease-out select-none',
        collapsed ? 'w-[68px]' : 'w-[250px] xl:w-[260px]'
      )}
      data-collapsed={collapsed}
    >
      <nav aria-label="Navigation principale" className="flex-1 pb-2">
        {groups.map((group, gi) => (
          <div key={group.title}>
            {collapsed
              ? (gi > 0 && <div className="mx-4 my-2 border-t border-gray-200 dark:border-surface-700" aria-hidden="true" />)
              : <div className={titleCls}>{group.title}</div>}
            {group.items.map((item) => {
              const isActive = isItemActive(item.href);
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  aria-label={collapsed ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={linkCls(isActive)}
                >
                  <Icon d={item.icon} active={isActive} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {!!badge && (collapsed
                    ? <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                    : (
                      <span className="ml-auto bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {badge}
                      </span>
                    ))}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto pb-3 border-t border-gray-200 dark:border-surface-700">
        {canSettings && (
          <>
            {!collapsed && <div className={titleCls}>Configuration</div>}
            <Link
              href="/parametres"
              title={collapsed ? 'Paramètres' : undefined}
              aria-label={collapsed ? 'Paramètres' : undefined}
              aria-current={isItemActive('/parametres') ? 'page' : undefined}
              className={clsx(linkCls(isItemActive('/parametres')), collapsed && 'mt-2')}
            >
              <Icon d={SETTINGS_ICON} active={isItemActive('/parametres')} />
              {!collapsed && 'Paramètres'}
            </Link>
          </>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          aria-label="Déconnexion"
          className={clsx(
            'flex items-center rounded-lg text-left text-[13.5px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 min-h-[38px]',
            collapsed ? 'justify-center mx-2 w-[calc(100%-1rem)]' : 'gap-3 mx-3 px-3 w-[calc(100%-1.5rem)]'
          )}
        >
          <svg aria-hidden="true" className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          {!collapsed && 'Déconnexion'}
        </button>
        <button
          onClick={toggle}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          className={clsx(
            'mt-1 flex items-center rounded-lg text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[38px]',
            collapsed ? 'justify-center mx-2 w-[calc(100%-1rem)]' : 'gap-3 mx-3 px-3 w-[calc(100%-1.5rem)]'
          )}
        >
          <svg aria-hidden="true" className={clsx('w-[18px] h-[18px] flex-shrink-0 transition-transform', collapsed && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></svg>
          {!collapsed && 'Replier le menu'}
        </button>
      </div>
    </aside>
  );
}
