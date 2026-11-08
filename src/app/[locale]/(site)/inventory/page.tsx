import { redirect } from "next/navigation";
import { currentRole } from "@/lib/workspace/guard";
import { homeFor } from "@/lib/workspace/nav";

/**
 * A partner's inventory became their jobs and earnings in the workspace.
 * The previous screen lives on in `legacy-inventory.tsx` until Task 43
 * replaces it.
 */
const TAB_TO_PAGE: Record<string, string> = {
  booked: "/manage/jobs",
  listings: "/manage/jobs",
  money: "/manage/earnings",
};

export default async function InventoryRedirect({
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
