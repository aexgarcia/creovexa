import { ReactNode } from 'react';

import { AdminLayout } from '@/components/layout/admin-layout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
