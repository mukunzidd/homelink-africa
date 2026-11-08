import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { TripTray } from "@/components/cart/trip-tray";
import { repos } from "@/lib/repos";
import { kigaliDay } from "@/lib/domain/instants";

/**
 * The public site's frame: the top bar, the page, the footer.
 *
 * It used to live in the locale layout. It moved here when the staff
 * workspace arrived, because the workspace has a sidebar shell of its own
 * and must not inherit a public header it would then have to hide. Both
 * groups share one root layout (`[locale]/layout.tsx`), so moving between
 * them is an ordinary client navigation, not a full page load.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // A line admin set in Content, shown only between its dates. Plain text,
  // never markup: it is typed into a form.
  const notices = await repos().admin.activeAnnouncements(kigaliDay());
  return (
    <>
      {notices.map((n) => (
        <p key={n.id} role="status" className="bg-brand-deep px-4 py-2 text-center text-[13.5px] font-medium text-on-brand">
          {n.text}
        </p>
      ))}
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <TripTray />
    </>
  );
}
