/**
 * Kigali's neighbourhoods as the landing page talks about them.
 *
 * The district is the administrative one (Gasabo, Kicukiro, Nyarugenge),
 * which is what appears on a lease and on a moto driver's mental map. The
 * character line lives in the message files under `places.<name>`, so it can
 * be translated rather than hardcoded in English here.
 *
 * Only places with verified inventory are ever shown; this table may know
 * about more than the repositories do, and that is fine.
 */
export const DISTRICTS: Record<string, "Gasabo" | "Kicukiro" | "Nyarugenge"> = {
  Gacuriro: "Gasabo",
  Kacyiru: "Gasabo",
  Kibagabaga: "Gasabo",
  Kimihurura: "Gasabo",
  Nyarutarama: "Gasabo",
  Remera: "Gasabo",
  Gikondo: "Kicukiro",
  Kicukiro: "Kicukiro",
  Rebero: "Kicukiro",
  Kiyovu: "Nyarugenge",
  Nyamirambo: "Nyarugenge",
};
