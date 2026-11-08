import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/no-unescaped-entities': 'off',
      // Les <img> du projet affichent des data-URL (logo, cachet, signature, QR) ou des gabarits HTML
      // pour PDF : next/image n'apporte rien (pas d'optimisation possible) et alourdirait la mise en page.
      '@next/next/no-img-element': 'off',
      // Nouvelles regles (React Compiler) de eslint-config-next 16 : signalees mais non bloquantes
      // tant que le code existant n'a pas ete revu.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];

export default config;
