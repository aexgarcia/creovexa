import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_CONFIG, type DatabaseConfig } from '#app/config/database.config';
import { PrismaClient } from './generated/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(DATABASE_CONFIG) config: DatabaseConfig) {
    super({
      adapter: new PrismaPg(
        { connectionString: config.url, max: 10, connectionTimeoutMillis: 5000 },
        { schema: config.schema },
      ),
      errorFormat: 'minimal',
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
