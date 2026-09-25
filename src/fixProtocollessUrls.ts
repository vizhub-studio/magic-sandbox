/**
 * Fixes protocol-less and insecure HTTP asset URLs to use HTTPS
 */
export function fixProtocollessUrls(html: string): string {
  return html.replace(
    /(<[^>]+\b(?:href|src)=["'])(\/\/|http:\/\/)([^"']+)(["'][^>]*>)/gi,
    (_, prefix, protocol, url, suffix) =>
      `${prefix}https://${url}${suffix}`,
  );
}
