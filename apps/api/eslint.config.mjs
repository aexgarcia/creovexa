import base from '@creovexa/config/eslint/base';

export default [
  ...base,
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    languageOptions: {
      globals: Object.fromEntries(
        ['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'].map(
          (name) => [name, 'readonly'],
        ),
      ),
    },
  },
];
