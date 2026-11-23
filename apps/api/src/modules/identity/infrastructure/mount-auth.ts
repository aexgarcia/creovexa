import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AUTH_BASE_PATH } from '#app/config/auth.config';
import { BETTER_AUTH } from '../identity.module.js';
import type { Auth } from './better-auth.js';

// Monta las rutas de Better Auth en la instancia de Express, con la ruta completa: app.use()
// quitaría el prefijo. Se llama antes de app.init(), así que queda antes del parser JSON de Nest
// y Better Auth recibe el cuerpo sin leer.
export function mountAuth(app: INestApplication): void {
  const auth = app.get<Auth>(BETTER_AUTH);
  const express = app.getHttpAdapter().getInstance() as Express;
  express.all(`${AUTH_BASE_PATH}/{*splat}`, toNodeHandler(auth));
}
