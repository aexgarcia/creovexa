import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCampaignOptions } from '../src/features/campaigns/services/load-campaign-options.ts';

test('loads options beyond the first 20 results and deduplicates overlapping pages', async () => {
  const calls = [];
  const controller = new AbortController();
  const result = await loadCampaignOptions(async (page, signal) => {
    calls.push(page);
    assert.equal(signal, controller.signal);
    return {
      data:
        page === 1
          ? Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: 'First page' }))
          : [
              { id: '19', name: 'Updated' },
              { id: '20', name: 'Beyond first page' },
            ],
      meta: { page, limit: 20, total: 21, totalPages: 2 },
    };
  }, controller.signal);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(result.length, 21);
  assert.equal(result.at(-1).name, 'Beyond first page');
  assert.equal(result.find((item) => item.id === '19').name, 'Updated');
});

test('does not return a partial catalog when a later page fails', async () => {
  await assert.rejects(
    loadCampaignOptions(async (page) => {
      if (page === 2) throw new Error('Unavailable');
      return { data: [{ id: 'one' }], meta: { page, limit: 20, total: 21, totalPages: 2 } };
    }),
    /Unavailable/,
  );
});

test('stops loading further pages when the form query is cancelled', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    loadCampaignOptions(async (page) => {
      calls++;
      controller.abort();
      return { data: [{ id: 'one' }], meta: { page, limit: 20, total: 21, totalPages: 2 } };
    }, controller.signal),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
});

test('handles an empty catalog without requesting another page', async () => {
  let calls = 0;
  assert.deepEqual(
    await loadCampaignOptions(async (page) => {
      calls++;
      return { data: [], meta: { page, limit: 20, total: 0, totalPages: 0 } };
    }),
    [],
  );
  assert.equal(calls, 1);
});
