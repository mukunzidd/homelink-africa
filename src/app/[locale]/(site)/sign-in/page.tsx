import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignInScreen } from "@/components/auth/auth-screens";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTitle"), robots: { index: false } };
}

/** Reads ?next= and ?to= on the client, so it waits behind a boundary rather than making the route dynamic. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <SignInScreen />
    </Suspense>
  );
}
