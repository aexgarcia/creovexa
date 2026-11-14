import base from '@creovexa/config/eslint/base';

export default [
  ...base,
  { ignores: ['src/infrastructure/persistence/prisma/generated/**'] },
  {
    // Dependency direction: content generation depends on campaigns, never the reverse.
    files: ['src/modules/campaigns/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['#app/modules/content-generation/*', '**/content-generation/**'],
              message: 'campaigns no puede depender de content-generation (ADR-0010).',
            },
          ],
        },
      ],
    },
  },
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
