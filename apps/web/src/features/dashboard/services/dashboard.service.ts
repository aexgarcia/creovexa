import { dashboardMock } from '../mocks/dashboard.mock';
import type { DashboardData } from '../types/dashboard.types';

class DashboardService {
  async getDashboard(): Promise<DashboardData> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return dashboardMock;
  }
}

export const dashboardService = new DashboardService();
