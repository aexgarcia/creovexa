import { readRendererConfig } from '#app/config/renderer.config';
describe('Renderer configuration', () => {
  it('defaults to a bounded render timeout', () =>
    expect(readRendererConfig({})).toEqual({ timeoutMs: 20000 }));
  it('accepts an explicit timeout', () =>
    expect(readRendererConfig({ RENDER_TIMEOUT_MS: '15000' })).toEqual({ timeoutMs: 15000 }));
  it.each(['0', '30001', 'NaN', '2.3', ''])('rejects invalid timeout %j', (timeout) => {
    expect(() => readRendererConfig({ RENDER_TIMEOUT_MS: timeout })).toThrow('RENDER_TIMEOUT_MS');
  });
});
