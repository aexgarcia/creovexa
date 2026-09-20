import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DATABASE_CONFIG } from '../src/config/database.config.js';

describe('API health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE_CONFIG)
      .useValue({ url: 'postgresql://health:health@127.0.0.1:1/health', schema: 'public' })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /health confirms that the HTTP application is running', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'creovexa-api' });
  });

  afterEach(async () => {
    await app.close();
  });
});
