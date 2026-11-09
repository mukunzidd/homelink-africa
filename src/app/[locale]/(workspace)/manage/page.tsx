import { redirect } from "next/navigation";
import { currentRole } from "@/lib/workspace/guard";
import { homeFor } from "@/lib/workspace/nav";

/** /manage on its own lands each role on its own first screen. */
export default async function ManageIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const home = homeFor(await currentRole());
  redirect(home ? `/${locale}${home}` : `/${locale}`);
}
