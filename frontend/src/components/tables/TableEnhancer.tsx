'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Style "e-CNPS" appliqué à tous les tableaux `.table-container` sans toucher chaque page :
 *  - barre « Exporter en Excel » au-dessus du tableau ;
 *  - ligne de filtres sous l'en-tête (filtre les lignes affichées).
 * Un tableau peut s'exclure avec l'attribut `data-no-enhance`.
 */

const BAR = 'data-te-bar';
const FILTERS = 'data-te-filters';

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
  const filterRow = table.querySelector(`tr[${FILTERS}]`);
  if (!filterRow) return;
  const values = Array.from(filterRow.querySelectorAll('input')).map((i) => ({
    idx: Number(i.dataset.col),
    v: norm(i.value.trim()),
  })).filter((f) => f.v);
  dataRows(table).forEach((row) => {
    const ok = values.every((f) => norm(cellText(row.cells[f.idx] || row)).includes(f.v));
    row.style.display = ok ? '' : 'none';
  });
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
    bar.className = 'te-bar flex justify-end px-2 py-1.5 bg-gray-50 dark:bg-surface-800 border-b border-gray-200 dark:border-surface-700';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Exporter en Excel';
    btn.className = 'text-[11px] px-2.5 py-1 border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-sm dark:bg-surface-700 dark:text-gray-200 dark:border-surface-600';
    btn.addEventListener('click', () => exportExcel(table, titre));
    bar.appendChild(btn);
    container.insertBefore(bar, container.firstChild);
  }

  const thead = table.tHead!;
  let filterRow = thead.querySelector<HTMLTableRowElement>(`tr[${FILTERS}]`);
  if (filterRow && filterRow.cells.length !== heads.length) {
    filterRow.remove();
    filterRow = null;
  }
  if (!filterRow) {
    filterRow = document.createElement('tr');
    filterRow.setAttribute(FILTERS, '');
    heads.forEach((h, i) => {
      const th = document.createElement('th');
      th.className = 'te-filter px-1 py-1 bg-gray-100 dark:bg-surface-700 border-b border-gray-300 dark:border-surface-600';
      if (!isActionColumn(cellText(h))) {
        const input = document.createElement('input');
        input.type = 'text';
        input.size = 1;
        input.style.width = '100%';
        input.style.minWidth = '2.5rem';
        input.dataset.col = String(i);
        input.setAttribute('aria-label', `Filtrer ${cellText(h)}`);
        input.className = 'w-full min-w-0 px-1.5 py-0.5 text-[11px] font-normal normal-case tracking-normal text-gray-800 bg-white border border-gray-300 rounded-sm focus:outline-none focus:border-primary-500 dark:bg-surface-800 dark:text-gray-100 dark:border-surface-600';
        input.addEventListener('input', () => applyFilters(table));
        th.appendChild(input);
      }
      filterRow!.appendChild(th);
    });
    thead.appendChild(filterRow);
  }
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
