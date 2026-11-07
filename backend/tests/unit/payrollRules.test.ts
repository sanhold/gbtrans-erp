import {
  calculerBulletin,
  calculerCnpsPatronal,
  calculerCnpsSalarie,
  calculerITS,
  calculerParts,
  CNPS_RULES,
} from '../../src/utils/payrollRules';

describe('payrollRules — parts fiscales', () => {
  it('célibataire sans enfant = 1 part', () => {
    expect(calculerParts('CELIBATAIRE', 0)).toBe(1);
  });
  it('marié avec 2 enfants = 3 parts', () => {
    expect(calculerParts('MARIE', 2)).toBe(3);
  });
  it('le nombre d\'enfants pris en compte est plafonné à 6', () => {
    expect(calculerParts('CELIBATAIRE', 20)).toBe(4);
  });
  it('le total est plafonné à 5 parts', () => {
    expect(calculerParts('MARIE', 10)).toBe(5);
  });
});

describe('payrollRules — CNPS', () => {
  it('part salariale = 6,3 % du brut', () => {
    expect(calculerCnpsSalarie(500_000)).toBe(31_500);
  });
  it('part patronale = 7,7 % + 5,75 % + 3 % du brut', () => {
    expect(calculerCnpsPatronal(500_000)).toBe(82_250);
  });
  it('la base est plafonnée au plafond mensuel', () => {
    expect(calculerCnpsSalarie(5_000_000)).toBe(Math.round(CNPS_RULES.plafondMensuel * CNPS_RULES.tauxSalarie));
    expect(calculerCnpsSalarie(5_000_000)).toBe(calculerCnpsSalarie(CNPS_RULES.plafondMensuel));
  });
});

describe('payrollRules — ITS', () => {
  it('aucun impôt sous la première tranche', () => {
    expect(calculerITS(75_000, 1)).toBe(0);
    expect(calculerITS(0, 1)).toBe(0);
  });
  it('applique 16 % sur la tranche 75 000 – 240 000', () => {
    expect(calculerITS(240_000, 1)).toBe(26_400);
  });
  it('est progressif : plus de revenu, plus d\'impôt', () => {
    expect(calculerITS(600_000, 1)).toBeGreaterThan(calculerITS(300_000, 1));
  });
  it('plus de parts réduit l\'impôt pour un même revenu', () => {
    expect(calculerITS(600_000, 3)).toBeLessThan(calculerITS(600_000, 1));
  });
});

describe('payrollRules — bulletin complet', () => {
  it('calcule un bulletin de référence (500 000 XOF, célibataire)', () => {
    const b = calculerBulletin({ salaireBase: 500_000, situationFamiliale: 'CELIBATAIRE', nombreEnfants: 0 });
    expect(b).toEqual({
      salaireBrut: 500_000,
      cnpsSalarie: 31_500,
      cnpsPatronal: 82_250,
      itsSalarie: 74_385,
      salaireNet: 394_115,
      coutTotalEmployeur: 582_250,
      parts: 1,
    });
  });
  it('intègre primes et indemnités au brut, et déduit retenues et avance du net', () => {
    const sans = calculerBulletin({ salaireBase: 300_000, situationFamiliale: 'MARIE', nombreEnfants: 2 });
    const avec = calculerBulletin({
      salaireBase: 300_000, primes: 50_000, indemnites: 25_000,
      autresRetenues: 10_000, avance: 20_000,
      situationFamiliale: 'MARIE', nombreEnfants: 2,
    });
    expect(avec.salaireBrut).toBe(375_000);
    expect(avec.salaireBrut).toBeGreaterThan(sans.salaireBrut);
    expect(avec.salaireNet).toBe(avec.salaireBrut - avec.cnpsSalarie - avec.itsSalarie - 30_000);
  });
  it('coût employeur = brut + CNPS patronale', () => {
    const b = calculerBulletin({ salaireBase: 800_000, situationFamiliale: 'MARIE', nombreEnfants: 3 });
    expect(b.coutTotalEmployeur).toBe(b.salaireBrut + b.cnpsPatronal);
  });
});
