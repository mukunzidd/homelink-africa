import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { AccountNav } from "./account-nav";

/**
 * The frame around a signed-in guest's own pages: the account menu on the
 * left, the page on the right.
 *
 * `/account/*` gets it from its layout; Trips, Saved and Notifications wrap
 * themselves in it, so their URLs stay where links and emails already point.
 * Anyone who is not a signed-in guest gets the page without the menu: a
 * visitor sees the page's own signed-out state, and staff have the workspace.
 */
export async function AccountFrame({ children }: { children: ReactNode }) {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role !== "guest") {
    return <div className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-6">{children}</div>;
  }

  const bookings = await repos().bookings.listForCurrentUser();
  const has = {
    renting: bookings.some((b) => b.stayMode === "lease" && b.status !== "cancelled"),
    // Viewings arrive with Task 25.
    viewings: false,
  };

  return (
    // `minmax(0,1fr)` on the phone too: a plain 1fr column grows to the
    // pill strip's full width, and the whole page then scrolls sideways.
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-6 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-8">
      <AccountNav has={has} />
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  );
}
