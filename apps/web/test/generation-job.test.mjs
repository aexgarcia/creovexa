import { test } from 'node:test';
import assert from 'node:assert/strict';

const { failureMessage, isInProgress } =
  await import('../src/features/campaigns/types/generation-job.ts');

test('only pending and running jobs keep the CMS polling', () => {
  assert.equal(isInProgress({ generationId: 'g', status: 'PENDING', failureCode: null }), true);
  assert.equal(isInProgress({ generationId: 'g', status: 'RUNNING', failureCode: null }), true);
  assert.equal(isInProgress({ generationId: 'g', status: 'READY', failureCode: null }), false);
  assert.equal(isInProgress({ generationId: 'g', status: 'FAILED', failureCode: 'X' }), false);
  assert.equal(isInProgress(null), false);
});

test('failures are explained without exposing internal codes', () => {
  const known = failureMessage({ generationId: 'g', status: 'FAILED', failureCode: 'TIMEOUT' });
  assert.match(known, /tardó demasiado/);
  const unknown = failureMessage({ generationId: 'g', status: 'FAILED', failureCode: 'WEIRD' });
  assert.match(unknown, /No se pudo completar/);
  assert.doesNotMatch(unknown, /WEIRD/);
});
