/**
 * Fixes protocol-less and insecure HTTP asset URLs to use HTTPS
 */
export function fixProtocollessUrls(html: string): string {
  html = fixTagAttributeUrl(html, "link", "href");
  html = fixTagAttributeUrl(html, "script", "src");
  html = fixTagAttributeUrl(html, "img", "src");
  return html;
}

function fixTagAttributeUrl(
  html: string,
  tagName: string,
  attributeName: string,
): string {
  const startTag = `<${tagName}`;
  let searchIndex = 0;
  let lowerHtml = html.toLowerCase();

  while (true) {
    const tagStart = lowerHtml.indexOf(startTag, searchIndex);
    if (tagStart === -1) return html;

    const boundaryCharacter = lowerHtml[tagStart + startTag.length];
    if (
      boundaryCharacter &&
      boundaryCharacter !== ">" &&
      boundaryCharacter !== "/" &&
      !/\s/.test(boundaryCharacter)
    ) {
      searchIndex = tagStart + startTag.length;
      continue;
    }

    const tagEnd = html.indexOf(">", tagStart);
    if (tagEnd === -1) return html;

    const tag = html.slice(tagStart, tagEnd + 1);
    const updatedTag = tag.replace(
      new RegExp(
        `(\\b${attributeName}=["'])(\\/\\/|http:\\/\\/)([^"']+)(["'])`,
        "i",
      ),
      (_, prefix, protocol, url, suffix) => `${prefix}https://${url}${suffix}`,
    );

    if (updatedTag !== tag) {
      html = `${html.slice(0, tagStart)}${updatedTag}${html.slice(tagEnd + 1)}`;
      lowerHtml = html.toLowerCase();
      searchIndex = tagStart + updatedTag.length;
    } else {
      searchIndex = tagEnd + 1;
    }
  }
}
