import { readApplicationConfig } from './application.config.js';

describe('Application configuration', () => {
  it('uses separate local ports for the API and CMS', () => {
    const config = readApplicationConfig({});
    expect(config).toEqual({ port: 3001, host: '127.0.0.1', corsOrigin: 'http://localhost:3000' });
  });

  it.each(['0', '65536', '3001abc', '3.5', '', ' '])('rejects invalid port %j', (API_PORT) => {
    expect(() => readApplicationConfig({ API_PORT })).toThrow('API_PORT');
  });

  it.each(['*', 'javascript:alert(1)', 'http://localhost/path', 'http://user:secret@localhost'])(
    'rejects unsafe CORS origin without exposing its value',
    (CORS_ORIGIN) => {
      expect(() => readApplicationConfig({ CORS_ORIGIN })).toThrow(
        'Configuración inválida: CORS_ORIGIN debe ser un origen HTTP o HTTPS.',
      );
    },
  );

  it('reads explicit configuration and normalizes a trailing slash', () => {
    const config = readApplicationConfig({
      API_PORT: '4001',
      API_HOST: '0.0.0.0',
      CORS_ORIGIN: 'https://cms.example.com/',
    });
    expect(config).toEqual({ port: 4001, host: '0.0.0.0', corsOrigin: 'https://cms.example.com' });
  });
});
