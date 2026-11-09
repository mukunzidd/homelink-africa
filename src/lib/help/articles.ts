import type { PricingCatalog } from "@/lib/domain/catalog";
import { CLEANING_FEE_RWF, ESCROW_THRESHOLD_RWF, SERVICE_FEE_RATE } from "@/lib/domain/pricing";
import { CHECK_IN_HOUR, HOLD_MINUTES } from "@/lib/domain/policies";

/**
 * The help centre as data. Each article is a key into `help.articles` in
 * the message files (a title and a body), filed under one of six
 * categories. Bodies take their numbers from here, which reads the same
 * constants and settings the booking code does, so an admin who changes
 * a refund window changes what the help says in the same breath.
 */
export const HELP_CATEGORIES = ["booking", "changing", "stay", "renting", "cars", "days"] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export const ARTICLES: { slug: string; category: HelpCategory }[] = [
  { slug: "how-to-book", category: "booking" },
  { slug: "ways-to-pay", category: "booking" },
  { slug: "fees", category: "booking" },
  { slug: "escrow", category: "booking" },
  { slug: "cancel-stay", category: "changing" },
  { slug: "cancel-car-day", category: "changing" },
  { slug: "change-dates", category: "changing" },
  { slug: "refund-timing", category: "changing" },
  { slug: "check-in", category: "stay" },
  { slug: "something-wrong", category: "stay" },
  { slug: "extras", category: "stay" },
  { slug: "verified", category: "stay" },
  { slug: "renting-how", category: "renting" },
  { slug: "renting-deposit", category: "renting" },
  { slug: "renting-repairs", category: "renting" },
  { slug: "renting-moving-out", category: "renting" },
  { slug: "car-with-driver", category: "cars" },
  { slug: "car-self-drive", category: "cars" },
  { slug: "car-pickup", category: "cars" },
  { slug: "car-insurance", category: "cars" },
  { slug: "day-what-to-bring", category: "days" },
  { slug: "day-permits", category: "days" },
  { slug: "day-group", category: "days" },
  { slug: "day-weather", category: "days" },
];

/** The numbers an article may quote, from the same sources the prices and refunds use. */
export function helpNumbers(catalog: PricingCatalog) {
  return {
    stayDays: catalog.windows.stay,
    carDays: catalog.windows.car,
    dayDays: catalog.windows.experience,
    feePercent: (Math.round(SERVICE_FEE_RATE * 1000) / 10).toString(),
    cleaning: CLEANING_FEE_RWF.toLocaleString("en-US"),
    escrowFrom: ESCROW_THRESHOLD_RWF.toLocaleString("en-US"),
    checkIn: `${CHECK_IN_HOUR}:00`,
    holdMinutes: HOLD_MINUTES,
  };
}
