import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG, readDatabaseConfig } from '#app/config/database.config';
import { APPLICATION_CONFIG, readApplicationConfig } from '#app/config/application.config';
import { configureHttp } from '#app/presentation/http/configure-http';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { BETTER_AUTH } from '#app/modules/identity/identity.module';
import type { Auth } from '#app/modules/identity/infrastructure/better-auth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CMS = readApplicationConfig({}).corsOrigin;

// Better Auth con su adapter de Prisma contra PostgreSQL, montado en la app de Nest (ADR-0012).
describe('Identity with Better Auth (PostgreSQL)', () => {
  let module: TestingModule;
  let app: INestApplication<App>;
  let database: PrismaService;
  let auth: Auth;

  beforeAll(async () => {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa pnpm test:integration con un esquema aislado.');
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(APPLICATION_CONFIG)
      .useValue(readApplicationConfig({}))
      .overrideProvider(HTTP_LOGGER)
      .useValue({ log() {}, error() {} })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    database = module.get(PrismaService);
    auth = module.get(BETTER_AUTH);
  });
  afterAll(async () => {
    await app?.close();
  });

  // Alta como la hará el comando administrativo: Better Auth calcula el hash.
  async function user(email: string, password: string) {
    const context = await auth.$context;
    const created = await context.internalAdapter.createUser(
      { email, name: 'Usuaria', emailVerified: true },
      { method: 'admin' },
    );
    await context.internalAdapter.linkAccount({
      userId: created.id,
      providerId: 'credential',
      accountId: created.id,
      password: await context.password.hash(password),
    });
    return created;
  }

  it('signs in through Nest, keeps the session in PostgreSQL and reads it back', async () => {
    const created = await user('ana@ejemplo.pe', 'clave-segura-123');
    expect(created.id).toMatch(UUID);
    const signIn = await request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .set('Origin', CMS)
      .send({ email: 'ana@ejemplo.pe', password: 'clave-segura-123' })
      .expect(200);
    const cookie = signIn.headers['set-cookie']![0]!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const session = await request(app.getHttpServer())
      .get('/auth/get-session')
      .set('Cookie', cookie.split(';')[0]!)
      .expect(200);
    expect(session.body.user).toMatchObject({ id: created.id, email: 'ana@ejemplo.pe' });
    const stored = await database.session.findMany({ where: { userId: created.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toMatch(UUID);
    // El hash queda en accounts y no es la contraseña.
    const account = await database.account.findFirst({ where: { userId: created.id } });
    expect(account!.password).not.toContain('clave-segura-123');

    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('Origin', CMS)
      .set('Cookie', cookie.split(';')[0]!)
      .expect(200);
    expect(await database.session.count({ where: { userId: created.id } })).toBe(0);
  });

  it('rejects public sign-up, wrong passwords and foreign origins', async () => {
    await user('beto@ejemplo.pe', 'clave-segura-123');
    await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .set('Origin', CMS)
      .send({ email: 'nuevo@ejemplo.pe', password: 'clave-segura-123', name: 'Nuevo' })
      .expect(400);
    expect(await database.user.count({ where: { email: 'nuevo@ejemplo.pe' } })).toBe(0);
    await request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .set('Origin', CMS)
      .send({ email: 'beto@ejemplo.pe', password: 'otra-clave-123' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .set('Origin', 'https://malicioso.example')
      .send({ email: 'beto@ejemplo.pe', password: 'clave-segura-123' })
      .expect(403);
  });

  it('keeps the JSON body parser working for the rest of the API', async () => {
    // Las rutas de Nest siguen recibiendo el cuerpo ya leído; un error de validación lo prueba.
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({ kind: 'PRODUCT' })
      .expect((res) => expect([400, 503]).toContain(res.status));
    expect(response.body.error).toBeDefined();
  });
});
