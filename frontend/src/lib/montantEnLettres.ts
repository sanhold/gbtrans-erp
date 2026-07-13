const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function convertirCentaines(n: number): string {
  if (n === 0) return '';
  if (n < 20) return UNITES[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 7 || d === 9) {
      return DIZAINES[d] + (u === 1 && d === 7 ? ' et ' : '-') + UNITES[10 + u];
    }
    if (u === 0) return DIZAINES[d] + (d === 8 ? 's' : '');
    if (u === 1 && d !== 8) return DIZAINES[d] + ' et un';
    return DIZAINES[d] + '-' + UNITES[u];
  }
  const c = Math.floor(n / 100);
  const r = n % 100;
  let result = '';
  if (c === 1) result = 'cent';
  else result = UNITES[c] + ' cent';
  if (r === 0 && c > 1) result += 's';
  else if (r > 0) result += ' ' + convertirCentaines(r);
  return result;
}

export function montantEnLettres(montant: number): string {
  if (montant === 0) return 'zéro Franc CFA';

  const n = Math.abs(Math.floor(montant));
  if (n === 0) return 'zéro Franc CFA';

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  let result = '';

  if (milliards > 0) {
    result += convertirCentaines(milliards) + ' milliard' + (milliards > 1 ? 's' : '') + ' ';
  }
  if (millions > 0) {
    result += convertirCentaines(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
  }
  if (milliers > 0) {
    if (milliers === 1) result += 'mille ';
    else result += convertirCentaines(milliers) + ' mille ';
  }
  if (reste > 0) {
    result += convertirCentaines(reste);
  }

  return result.trim() + ' Franc CFA';
}
