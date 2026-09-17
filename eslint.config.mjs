import base from '@creovexa/config/eslint/base';

export default [
  ...base,
  { ignores: ['.local/**', 'creovexa-back/**', 'creovexa-front/**', 'apps/**'] },
];
