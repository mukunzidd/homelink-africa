import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { isWorkspaceRole, workspaceNav } from "@/lib/workspace/nav";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceSignIn } from "@/components/workspace/workspace-sign-in";
import { NotForYou } from "@/components/workspace/not-for-you";
import type { Badges } from "@/components/workspace/nav-list";

/**
 * The door to the workspace.
 *
 * A visitor gets the preview sign-in, a guest gets sent back to their
 * account, and a workspace role gets the shell with its own sections. Each
 * page then asks `requireSection` about itself, because a role that may open
 * the workspace may still not open Finance.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);

  if (role === "visitor") return <WorkspaceSignIn />;
  if (!isWorkspaceRole(role)) {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-canvas">
        <NotForYou kind="guest" />
      </div>
    );
  }

  const [threads, asks, stays] = await Promise.all([
    repos().messaging.forRole(role),
    role === "ops" || role === "admin" ? repos().ops.addOnRequests() : Promise.resolve([]),
    role === "admin" ? repos().stays.list() : Promise.resolve([]),
  ]);

  const badges: Badges = {
    inbox: threads.filter((c) => c.unreadCount > 0).length,
    asks: asks.filter((a) => a.status === "open").length,
  };

  return (
    <WorkspaceShell
      role={role}
      groups={workspaceNav(role)}
      badges={badges}
      properties={stays.map((s) => ({ id: s.id, name: s.name }))}
    >
      {children}
    </WorkspaceShell>
  );
}
