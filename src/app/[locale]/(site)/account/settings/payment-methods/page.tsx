import { setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { Methods } from "@/components/account/settings-forms";

/** Saved cards and Mobile Money numbers, one of them the default at checkout. */
export default async function PaymentMethods({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  return <Methods methods={await repos().account.methods()} />;
}
