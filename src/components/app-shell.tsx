"use client";

import { useEffect, useState } from "react";
import type { PermissionKey } from "@/lib/staff";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { AssistantWidget } from "./assistant-widget";

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

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setSidebarOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  return (
    <div className="app-ui flex min-h-svh bg-surface-1">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-canvas focus:px-4 focus:py-3 focus:text-primary">Saltar para o conteúdo</a>
      <AppSidebar
        permissions={permissions}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        userEmail={userEmail}
        logoutAction={logoutAction}
      />

      <div inert={sidebarOpen || undefined} className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          onMenuClick={() => setSidebarOpen(true)}
          menuOpen={sidebarOpen}
        />
        <main id="main-content" className="app-content mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
          {children}
        </main>
      </div>
      <AssistantWidget />
    </div>
  );
}
