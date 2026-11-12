'use client';

/** Ligne « aucune donnée » avec appel à l'action, à placer dans un <tbody>. */
export default function EmptyRow({ colSpan, message, ctaLabel, onCta }: { colSpan: number; message: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12 px-4 text-gray-600 dark:text-gray-400">
        <p>{message}</p>
        {ctaLabel && onCta && (
          <button type="button" onClick={onCta} className="btn-primary mt-3">{ctaLabel}</button>
        )}
      </td>
    </tr>
  );
}
