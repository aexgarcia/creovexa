import { entityId } from '#app/domain/entity-id';
import type { DashboardReader } from './dashboard-reader.js';
export class GetDashboard {
  constructor(private readonly reader: DashboardReader) {}
  execute(input: { organizationId: string }) {
    return this.reader.read(entityId(input.organizationId, 'organizationId'));
  }
}
