import { readAuthConfig } from '#app/config/auth.config';

const SECRET = 'x'.repeat(40);

describe('Auth configuration', () => {
  it('trusts only the CMS origin and derives the base URL from the API address', () => {
    expect(
      readAuthConfig({
        AUTH_SECRET: SECRET,
        CORS_ORIGIN: 'http://localhost:3000',
        API_PORT: '3001',
      }),
    ).toEqual({
      secret: SECRET,
      baseUrl: 'http://127.0.0.1:3001',
      trustedOrigins: ['http://localhost:3000'],
      production: false,
    });
  });
  it('generates a secret per process outside production', () => {
    const first = readAuthConfig({}).secret;
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(readAuthConfig({}).secret).not.toBe(first);
  });
  it('requires a long secret and HTTPS in production', () => {
    expect(() => readAuthConfig({ NODE_ENV: 'production' })).toThrow('AUTH_SECRET');
    expect(() => readAuthConfig({ AUTH_SECRET: 'corto' })).toThrow('32');
    expect(() =>
      readAuthConfig({
        NODE_ENV: 'production',
        AUTH_SECRET: SECRET,
        AUTH_BASE_URL: 'http://api.creovexa.pe',
      }),
    ).toThrow('AUTH_BASE_URL');
    expect(
      readAuthConfig({
        NODE_ENV: 'production',
        AUTH_SECRET: SECRET,
        AUTH_BASE_URL: 'https://api.creovexa.pe/',
      }).baseUrl,
    ).toBe('https://api.creovexa.pe');
  });
});
