import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { PlansModule } from '../dist/modules/plans/plans.module.js';
import { AdministerPlans } from '../dist/modules/plans/application/use-cases/administer-plans.js';

// Comando del propietario del despliegue (ADR-0033). Ejemplos:
//   node scripts/manage-plan.mjs asignar <organizationId> EMPRENDE|NEGOCIO|AGENCIA
//   node scripts/manage-plan.mjs devolver <organizationId> IMAGE|COPY|PRODUCT_SUGGESTION <unidades>
const envFile = new URL('../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);
const [action, organizationId, value, units] = process.argv.slice(2);
if (!['asignar', 'devolver'].includes(action) || !organizationId || !value) {
  console.error(
    'Uso: manage-plan.mjs asignar <organizationId> <plan>\n' +
      '     manage-plan.mjs devolver <organizationId> <tipo> <unidades>',
  );
  process.exit(1);
}
const app = await NestFactory.createApplicationContext(PlansModule, { logger: false });
try {
  const plans = app.get(AdministerPlans);
  if (action === 'asignar') {
    await plans.assign(organizationId, value);
    console.log(`Plan ${value} asignado a ${organizationId}.`);
  } else {
    await plans.refund(organizationId, value, Number(units));
    console.log(`Devueltas ${units} unidades de ${value} a ${organizationId}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
