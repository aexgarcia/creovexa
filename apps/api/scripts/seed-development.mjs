import 'reflect-metadata';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { CommercialPersistenceModule } from '../dist/infrastructure/commercial-persistence.module.js';
import { PrismaOrganizationRepository } from '../dist/modules/organizations/infrastructure/persistence/prisma/prisma-organization.repository.js';
import { CreateOrganization } from '../dist/modules/organizations/application/use-cases/create-organization.js';
import { readCatalogHttpConfig } from '../dist/config/catalog-http.config.js';
import { entityId } from '../dist/domain/entity-id.js';

const envFile = new URL('../.env', import.meta.url);
loadEnvFile(envFile);
if (!['development', 'test', undefined].includes(process.env.NODE_ENV))
  throw new Error('La organización de desarrollo no se prepara en producción.');
const config = readCatalogHttpConfig(process.env);
const id = config.organizationId ?? entityId(randomUUID());
const original = await readFile(envFile, 'utf8');
const app = await NestFactory.createApplicationContext(CommercialPersistenceModule, {
  logger: false,
});
try {
  const repository = app.get(PrismaOrganizationRepository);
  if (!(await repository.findById(id))) {
    await new CreateOrganization(repository, { next: () => id }, { now: () => new Date() }).execute(
      { name: 'Creovexa local' },
    );
  }
  const assignment = 'DEV_ORGANIZATION_ID=' + id;
  const updated = /^DEV_ORGANIZATION_ID=.*$/m.test(original)
    ? original.replace(/^DEV_ORGANIZATION_ID=.*$/m, assignment)
    : original.trimEnd() + '\n' + assignment + '\n';
  await writeFile(envFile, updated);
  console.log('Organización local disponible: ' + id + '. Reinicia la API para usarla.');
} finally {
  await app.close();
}
