"use client";

import { useState } from "react";
import type { PermissionKey } from "@/lib/staff";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

export function AppShell({
  permissions,
  userEmail,
  logoutAction,
  children,
}: {
  permissions: PermissionKey[];
  userEmail: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-svh">
      <AppSidebar
        permissions={permissions}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          userEmail={userEmail}
          onMenuClick={() => setSidebarOpen(true)}
          logoutAction={logoutAction}
        />
        <main className="flex-1 overflow-y-auto bg-surface-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
