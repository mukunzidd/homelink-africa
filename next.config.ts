import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Dev only. Headless review runs against 127.0.0.1 as often as localhost,
  // and without this the dev server answers its HMR and asset requests 403.
  allowedDevOrigins: ["127.0.0.1"],
  // The team preview on Netlify sets HOMELINK_NOINDEX (netlify.toml): a
  // prototype shared by link must not be indexed. Set from here because
  // Netlify's own header rules do not reach server-rendered pages.
  async headers() {
    if (process.env.HOMELINK_NOINDEX !== "1") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default withNextIntl(nextConfig);
