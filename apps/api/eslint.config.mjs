import base from '@creovexa/config/eslint/base';

export default [
  ...base,
  { ignores: ['src/infrastructure/persistence/prisma/generated/**'] },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.integration-spec.ts'],
    languageOptions: {
      globals: Object.fromEntries(
        ['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'].map(
          (name) => [name, 'readonly'],
        ),
      ),
    },
  },
];
