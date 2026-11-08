import { redirect } from "next/navigation";
import { currentRole } from "@/lib/workspace/guard";
import { homeFor } from "@/lib/workspace/nav";

/**
 * The queue's four tabs became workspace pages. Old links and bookmarks land
 * on the page their tab turned into; anyone without a workspace goes home.
 * The previous screen lives on in `legacy-queue.tsx` until its parts move
 * into the workspace pages that replace it.
 */
const TAB_TO_PAGE: Record<string, string> = {
  verify: "/manage/inspections",
  asks: "/manage/asks",
  payouts: "/manage/finance?tab=payouts",
  threads: "/manage/inbox",
};

export default async function QueueRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale }, { tab }] = await Promise.all([params, searchParams]);
  const home = homeFor(await currentRole());
  if (!home) redirect(`/${locale}`);
  redirect(`/${locale}${TAB_TO_PAGE[tab ?? ""] ?? home}`);
}
