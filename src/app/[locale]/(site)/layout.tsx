import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { TripTray } from "@/components/cart/trip-tray";

/**
 * The public site's frame: the top bar, the page, the footer.
 *
 * It used to live in the locale layout. It moved here when the staff
 * workspace arrived, because the workspace has a sidebar shell of its own
 * and must not inherit a public header it would then have to hide. Both
 * groups share one root layout (`[locale]/layout.tsx`), so moving between
 * them is an ordinary client navigation, not a full page load.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <TripTray />
    </>
  );
}
