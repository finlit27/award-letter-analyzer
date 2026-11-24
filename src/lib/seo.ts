// Search engine settings for analyzer.finlitgarden.com: robots.txt, sitemap.xml and noindex headers.
//
// Only the landing page is public. An analysis page is one family's private numbers reached by a
// share link, and /success is the after-payment page, so both get an X-Robots-Tag: noindex header.
// They are deliberately NOT disallowed in robots.txt: Google can't see a noindex on a page it is
// told not to fetch, and can still list the bare URL.
export const SITE_URL = "https://analyzer.finlitgarden.com";

export const PUBLIC_PATHS = ["/"];

// Next.js header "source" patterns (https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
export const NOINDEX_SOURCES = ["/analyze/:path*", "/success"];

export function noindexHeaders() {
  return NOINDEX_SOURCES.map((source) => ({
    source,
    headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
  }));
}
