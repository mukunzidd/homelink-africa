import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { NotBuiltYet } from "@/components/shell/not-built-yet";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = await repos().stays.bySlug(slug);
  if (!listing) notFound();

  await getTranslations("listing");

  return <NotBuiltYet title={listing.name} />;
}
