export function exportCSV(filename: string, colonnes: { cle: string; label: string }[], lignes: Record<string, any>[]) {
  const echapper = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const entete = colonnes.map(c => echapper(c.label)).join(';');
  const corps = lignes.map(ligne => colonnes.map(c => echapper(ligne[c.cle])).join(';')).join('\n');
  const csv = `﻿${entete}\n${corps}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
