import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for next/link and the router hooks. Always import
 * from here rather than from `next/link`, so the locale prefix is preserved.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
