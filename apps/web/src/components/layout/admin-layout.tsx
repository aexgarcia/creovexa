import { ReactNode } from 'react';

import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminHeader />

          <main id="main-content" className="flex-1 px-4 pt-6 pb-16 md:px-6 lg:px-10 lg:pt-8">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
