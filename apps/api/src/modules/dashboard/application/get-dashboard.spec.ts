import { GetDashboard } from './get-dashboard.js';
import type { DashboardReader, DashboardResult } from './dashboard-reader.js';
import { InvalidEntityIdError } from '#app/domain/entity-id';
it('scopes the dashboard and validates identifiers before reading', async () => {
  const result: DashboardResult = {
    totals: { products: 0, templates: 0, campaigns: 0, published: 0, pendingApproval: 0 },
    campaignsByStatus: [],
    publicationsByPlatform: [],
    recentCampaigns: [],
  };
  const read = vi.fn<DashboardReader['read']>().mockResolvedValue(result);
  const query = new GetDashboard({ read });
  const id = '11111111-1111-4111-8111-111111111111';
  expect(await query.execute({ organizationId: id })).toEqual(result);
  expect(read).toHaveBeenCalledWith(id);
  expect(() => query.execute({ organizationId: 'invalid' })).toThrow(InvalidEntityIdError);
  expect(read).toHaveBeenCalledTimes(1);
});
