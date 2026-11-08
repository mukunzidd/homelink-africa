"use client";

import { Suspense, useCallback, useState, type ReactNode } from "react";
import type { Role } from "@/lib/domain/types";
import type { NavGroup } from "@/lib/workspace/nav";
import { Sidebar } from "./sidebar";
import { WorkspaceTopbar } from "./workspace-topbar";
import { WorkspaceDrawer } from "./workspace-drawer";
import { BottomTabs } from "./bottom-tabs";
import type { Badges } from "./nav-list";
import { cn } from "@/lib/cn";

/**
 * The frame every workspace page sits in: sidebar on the left from 1024px,
 * a drawer below that, the top strip, then the page.
 *
 * The page column is capped at 1360px and centred in what is left beside
 * the sidebar. Tables want width, but a 2560px monitor with a status pill on
 * the far right of each row is a table nobody can read across.
 */
export function WorkspaceShell({
  role,
  groups,
  badges,
  properties,
  bell,
  children,
}: {
  role: Role;
  groups: NavGroup[];
  badges: Badges;
  properties: { id: string; name: string }[];
  bell?: ReactNode;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const close = useCallback(() => setDrawer(false), []);
  const partner = role === "driver" || role === "guide";

  return (
    <div className="flex min-h-screen flex-1 bg-canvas">
      <Sidebar groups={groups} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The switcher reads search params, which needs a boundary to keep
            the rest of the frame static. */}
        <Suspense fallback={<div className="h-14 border-b border-line bg-surface" />}>
          <WorkspaceTopbar
            role={role}
            properties={properties}
            onOpenDrawer={() => setDrawer(true)}
            bell={bell}
          />
        </Suspense>
        <main
          id="content"
          className={cn(
            "mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            partner && "pb-[calc(56px+env(safe-area-inset-bottom)+24px)] sm:pb-6",
          )}
        >
          {children}
        </main>
      </div>
      <WorkspaceDrawer open={drawer} onClose={close} groups={groups} badges={badges} />
      {partner && <BottomTabs badges={badges} onMore={() => setDrawer(true)} />}
    </div>
  );
}
