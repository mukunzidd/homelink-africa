/**
 * Every route lives under `[locale]`, which supplies `<html>` and `<body>`
 * because the `lang` attribute has to match the request locale. This root
 * layout is a required pass-through.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
