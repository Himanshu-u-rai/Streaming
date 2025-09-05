// Placeholder client-side helper to log XML for dynamic episode sitemap entries.
// In production this should run server-side / during a build step.
export function buildEpisodeSitemapEntries(videos) {
  const today = new Date().toISOString().slice(0, 10);
  return videos
    .map(
      (v) =>
        `  <url>\n    <loc>https://your-domain.com/episode/${slugify(
          v.title
        )}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>`
    )
    .join("\n");
}
// slugify duplication kept local to avoid import issues in static hosting context
function slugify(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
