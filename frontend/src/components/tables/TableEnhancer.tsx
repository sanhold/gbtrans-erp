'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Style "e-CNPS" appliqué à tous les tableaux `.table-container` sans toucher chaque page :
 *  - barre « Exporter en Excel » au-dessus du tableau ;
 *  - une seule recherche (filtre les lignes affichées sur tout leur contenu), à la place des filtres par colonne.
 * Un tableau peut s'exclure avec l'attribut `data-no-enhance`.
 */

const BAR = 'data-te-bar';
const SEARCH = 'data-te-search';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cellText = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim();

function headerCells(table: HTMLTableElement): HTMLTableCellElement[] {
  const row = table.tHead?.rows[0];
  return row ? Array.from(row.cells) : [];
}

function isActionColumn(label: string) {
  return label === '' || /^actions?$/i.test(label);
}

function dataRows(table: HTMLTableElement): HTMLTableRowElement[] {
  const body = table.tBodies[0];
  if (!body) return [];
  return Array.from(body.rows).filter((r) => r.cells.length > 1 || r.cells[0]?.colSpan === 1);
}

function applyFilters(table: HTMLTableElement) {
  const input = table.closest('.table-container')?.querySelector<HTMLInputElement>(`input[${SEARCH}]`);
  const v = norm((input?.value || '').trim());
  let visibles = 0;
  dataRows(table).forEach((row) => {
    const ok = !v || norm(cellText(row)).includes(v);
    row.style.display = ok ? '' : 'none';
    if (ok) visibles++;
  });
  const compteur = table.closest('.table-container')?.querySelector('[data-te-count]');
  if (compteur) compteur.textContent = `${visibles} ligne${visibles > 1 ? 's' : ''} sur cette page`;
}

function exportExcel(table: HTMLTableElement, titre: string) {
  const heads = headerCells(table);
  const cols = heads.map((h, i) => ({ i, label: cellText(h) })).filter((c) => !isActionColumn(c.label));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = dataRows(table).filter((r) => r.style.display !== 'none');
  const html =
    '<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>' +
    cols.map((c) => `<th>${esc(c.label)}</th>`).join('') +
    '</tr></thead><tbody>' +
    rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(cellText(r.cells[c.i] || r))}</td>`).join('')}</tr>`).join('') +
    '</tbody></table></body></html>';
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${titre}-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function enhance(container: HTMLElement, titre: string) {
  const table = container.querySelector('table');
  if (!table || table.hasAttribute('data-no-enhance') || container.hasAttribute('data-no-enhance')) return;
  const heads = headerCells(table);
  if (heads.length < 2) return;

  if (!container.querySelector(`:scope > [${BAR}]`)) {
    const bar = document.createElement('div');
    bar.setAttribute(BAR, '');
    bar.className = 'te-bar flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-white dark:bg-surface-800 border-b border-gray-100 dark:border-surface-700';
    const compteur = document.createElement('span');
    compteur.setAttribute('data-te-count', '');
    compteur.className = 'text-sm text-gray-500 dark:text-gray-400';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg><span>Exporter</span>';
    btn.className = 'inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-surface-800 dark:text-gray-200 dark:border-surface-600 dark:hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
    btn.addEventListener('click', () => exportExcel(table, titre));
    const recherche = document.createElement('input');
    recherche.type = 'search';
    recherche.setAttribute(SEARCH, '');
    recherche.setAttribute('aria-label', 'Filtrer les lignes affichées');
    recherche.placeholder = 'Filtrer les lignes affichées…';
    recherche.className = 'order-last sm:order-none w-full sm:w-72 h-8 px-3 text-[13px] text-gray-800 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:bg-surface-900/40 dark:text-gray-100 dark:border-surface-600';
    recherche.addEventListener('input', () => applyFilters(table));
    bar.appendChild(compteur);
    bar.appendChild(recherche);
    bar.appendChild(btn);
    container.insertBefore(bar, container.firstChild);
  }

  // Nettoyage : d'anciennes lignes de filtres par colonne ne doivent plus subsister.
  table.tHead?.querySelectorAll('tr[data-te-filters]').forEach((r) => r.remove());
  applyFilters(table);
}

export default function TableEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    const titre = (pathname || 'export').split('/').filter(Boolean).join('-') || 'export';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => document.querySelectorAll<HTMLElement>('.table-container').forEach((c) => enhance(c, titre));
    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    run();
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
