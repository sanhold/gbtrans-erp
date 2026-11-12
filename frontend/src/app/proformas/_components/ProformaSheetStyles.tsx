'use client';

/** Styles de la feuille A4 « .pf-sheet » (inchangés par rapport aux anciennes pages). À monter une seule fois par page. */
export default function ProformaSheetStyles() {
  return (
    <style jsx global>{`
        :root { --pf-ink:#16232e; --pf-ink-soft:#56626f; --pf-gold:#e8821e; --pf-gold-soft:#fdf1e3; --pf-paper:#FFFFFF; --pf-line:#dbe2e8; --pf-danger:#B3492F; }

        .pf-sheet-wrap { background:#e9edf1; padding:28px 20px; border-radius:2px; display:flex; justify-content:center; overflow-x:auto; min-width:0; }
        .pf-sheet { width:210mm; max-width:100%; min-height:280mm; background:var(--pf-paper); color:var(--pf-ink); padding:14mm 13mm; font-family:'Segoe UI',Arial,sans-serif; box-shadow:0 2px 10px rgba(0,0,0,.18); }

        .pf-doc-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--pf-ink); padding-bottom:12px; margin-bottom:18px; }
        .pf-company-name { font-size:20px; font-weight:700; letter-spacing:.01em; }
        .pf-company-sub { font-size:11px; color:var(--pf-ink-soft); margin-top:2px; }
        .pf-company-addr { font-size:10px; color:#5C6580; margin-top:6px; line-height:1.5; }
        .pf-doc-title { text-align:right; flex:none; }
        .pf-doc-label { font-size:19px; font-weight:700; letter-spacing:.05em; }
        .pf-doc-num { font-size:11.5px; color:var(--pf-ink-soft); margin-top:3px; }
        .pf-doc-num em { color:var(--pf-gold); font-style:normal; }

        .pf-meta-grid { display:flex; gap:10px; margin-bottom:14px; align-items:stretch; }
        .pf-meta-block { flex:1; border:1px solid var(--pf-line); padding:9px 11px; }
        .pf-meta-k { font-size:9px; text-transform:uppercase; letter-spacing:.08em; color:var(--pf-gold); margin-bottom:6px; font-weight:700; }
        .pf-meta-v { font-size:12px; padding:1px 0; }
        .pf-meta-strong { font-weight:700; }
        .pf-meta-dim { color:#8b93ad; font-size:9.5px; margin-top:4px; }
        .pf-meta-placeholder { color:#b6b0a0; font-style:italic; }
        .pf-ci-flag { display:inline-flex; margin-left:6px; vertical-align:middle; box-shadow:0 0 0 1px var(--pf-line); border-radius:1px; overflow:hidden; }
        .pf-ci-flag span:nth-child(1) { width:8px; height:10px; background:#f77f00; }
        .pf-ci-flag span:nth-child(2) { width:8px; height:10px; background:#fff; }
        .pf-ci-flag span:nth-child(3) { width:8px; height:10px; background:#009e60; }

        .pf-fob-block { flex:1.2; border:1px solid var(--pf-line); padding:6px 9px; }
        .pf-fob-table { width:100%; font-size:10px; color:var(--pf-ink-soft); border-collapse:collapse; }
        .pf-fob-table td { padding:2px 4px; }
        .pf-fob-table .pf-num { text-align:right; font-weight:700; font-family:'Courier New',monospace; color:var(--pf-ink); }
        .pf-fob-strong { font-weight:700; color:var(--pf-gold) !important; }

        .pf-titre { background:var(--pf-gold-soft); padding:8px 11px; margin-bottom:16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; border-left:3px solid var(--pf-gold); color:var(--pf-ink); }

        .pf-empty-hint { font-size:12px; color:#9AA0B5; text-align:center; padding:30px 10px; border:1px dashed var(--pf-line); margin-bottom:16px; }

        .pf-inline-toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; border:1px dashed var(--pf-line); border-radius:4px; padding:10px 12px; margin-bottom:16px; background:rgba(174,124,31,.03); }
        .pf-inline-btn-outline { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--pf-gold); color:var(--pf-gold); font-size:11.5px; font-weight:700; padding:6px 12px; border-radius:4px; cursor:pointer; font-family:inherit; }
        .pf-inline-btn-outline:hover { background:var(--pf-gold-soft); }
        .pf-inline-badge { background:var(--pf-gold); color:#fff; font-size:9.5px; font-weight:800; padding:1px 7px; border-radius:10px; margin-left:2px; }
        .pf-inline-group-add { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pf-inline-select { border:1px solid var(--pf-line); background:#fff; color:var(--pf-ink); font-size:11.5px; padding:6px 8px; border-radius:4px; font-family:inherit; min-width:180px; }
        .pf-inline-select:focus { outline:none; border-color:var(--pf-gold); }
        .pf-inline-btn-solid { background:var(--pf-gold); color:#fff; border:none; font-size:11.5px; font-weight:700; padding:7px 14px; border-radius:4px; cursor:pointer; white-space:nowrap; font-family:inherit; }
        .pf-inline-btn-solid:hover { background:#c2690f; }

        .pf-section-title-row { color:var(--pf-ink); padding:6px 10px; font-size:10px; letter-spacing:.03em; font-weight:700; text-align:left; border-top:1px solid var(--pf-line); border-bottom:1px solid var(--pf-line); }
        table.pf-items { width:100%; border-collapse:collapse; border:1px solid var(--pf-line); font-size:11.5px; }
        table.pf-items th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.05em; color:var(--pf-ink-soft); border-bottom:1px solid var(--pf-line); padding:5px 6px; }
        table.pf-items td { padding:5px 6px; border-bottom:1px solid var(--pf-line); vertical-align:middle; }
        .pf-numcol { width:28px; text-align:center; color:#8b93ad; }
        .pf-tvacol { width:36px; text-align:center; }
        .pf-tva-checkbox { accent-color:#9AA0B5; opacity:.65; cursor:not-allowed; }
        .pf-montantcol { width:110px; }
        .pf-rmcol { width:70px; }
        .pf-move { display:inline-flex; gap:2px; float:right; }
        .pf-move button svg { display:block; }
        .pf-move button { border:1px solid var(--pf-line); background:#fff; color:var(--pf-ink-soft); font-size:9px; line-height:1; padding:3px 5px; cursor:pointer; border-radius:2px; }
        .pf-move button:hover { background:var(--pf-gold-soft); color:var(--pf-ink); }
        .pf-section-title-row { display:table-cell; }
        table.pf-items .pf-num { text-align:right; white-space:nowrap; }
        table.pf-items input { border:none; background:transparent; font-family:inherit; width:100%; font-size:11.5px; color:var(--pf-ink); padding:1px 2px; }
        table.pf-items input:focus { outline:1px dashed var(--pf-gold); }
        .pf-num-input { text-align:right; font-family:'Courier New',monospace; font-weight:700; }
        table.pf-items .pf-rmcol button { background:none; border:none; color:var(--pf-danger); cursor:pointer; font-size:12px; }
        .pf-foot-row td { font-weight:700; color:var(--pf-ink); background:#f6f8fa; border-top:1px solid var(--pf-line); border-bottom:1px solid var(--pf-line); }
        .pf-foot-row td:first-child { text-align:right; font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; }
        .pf-subtotal-row td { font-weight:700; color:var(--pf-ink); border-top:1px solid var(--pf-line); border-bottom:1px solid var(--pf-line); }
        .pf-subtotal-row td:first-child { text-align:right; font-size:10.5px; }

        .pf-bottom-row { display:flex; gap:12px; margin-top:8px; margin-bottom:14px; align-items:stretch; }
        .pf-lettres-block { flex:1; border:1px solid var(--pf-line); padding:8px 11px; }
        .pf-lettres-text { font-style:italic; font-weight:700; color:var(--pf-ink); font-size:11px; line-height:1.4; margin-top:2px; }
        .pf-totals-table { width:230px; border:1px solid var(--pf-line); border-collapse:collapse; font-size:11.5px; }
        .pf-totals-table td { padding:5px 9px; border-bottom:1px solid var(--pf-line); }
        .pf-totals-table td:first-child { color:var(--pf-ink-soft); }
        .pf-totals-table .pf-num { text-align:right; font-weight:700; font-family:'Courier New',monospace; }
        .pf-totals-table tr.pf-grand td { border-bottom:none; font-weight:800; font-size:13px; color:var(--pf-ink); padding-top:6px; padding-bottom:6px; }

        .pf-signature-row { display:flex; justify-content:flex-end; margin-top:8px; margin-bottom:14px; }
        .pf-signature-box { text-align:center; width:200px; }
        .pf-signature-imgs { display:flex; align-items:center; justify-content:center; gap:6px; }
        .pf-cachet-img { max-width:90px; }
        .pf-signature-img { max-width:140px; max-height:70px; object-fit:contain; }
        .pf-signature-placeholder { height:70px; }
        .pf-signature-label { border-top:1px solid var(--pf-line); padding-top:4px; font-size:9px; color:var(--pf-ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.04em; }


        .pf-footer-grid { margin-top:10px; margin-bottom:10px; font-size:11px; color:var(--pf-ink-soft); }
        .pf-obs-text { border:1px solid var(--pf-line); padding:8px; margin-top:4px; font-size:11px; line-height:1.5; }


        .pf-sheet.pf-exporting input, .pf-sheet.pf-exporting textarea { border:none !important; outline:none !important; background:transparent !important; }
        .pf-sheet.pf-exporting .pf-no-export { display:none !important; }
        .pf-sheet.pf-exporting { box-shadow:none; }
    `}</style>
  );
}
