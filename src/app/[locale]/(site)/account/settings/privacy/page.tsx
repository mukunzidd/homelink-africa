import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { PrivacyForm } from "@/components/account/settings-forms";

/** A copy of everything we hold about you, and the way to leave. */
export default async function Privacy({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  const t = await getTranslations("account.settings");
  const r = repos();
  const [profile, methods, bookings, viewings] = await Promise.all([r.account.profile(), r.account.methods(), r.bookings.listForCurrentUser(), r.viewings.forCurrentUser()]);
  const payments = (await r.bookings.payments()).filter((p) => bookings.some((b) => b.id === p.bookingId));
  const data = {
    exportedAt: new Date().toISOString(),
    profile,
    paymentMethods: methods,
    // The guest's own record: staff notes and who drives are the desk's, not theirs.
    bookings: bookings.map((b) => {
      const copy = { ...b };
      delete copy.staffNotes;
      delete copy.partnerId;
      return copy;
    }),
    payments,
    viewings,
  };
  return <PrivacyForm data={data} word={t("deleteWord")} />;
}
