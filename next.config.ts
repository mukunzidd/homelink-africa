import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Dev only. Headless review runs against 127.0.0.1 as often as localhost,
  // and without this the dev server answers its HMR and asset requests 403.
  allowedDevOrigins: ["127.0.0.1"],
};

export default withNextIntl(nextConfig);
