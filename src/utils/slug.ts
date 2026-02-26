/**
 * Universal URL matcher: parses problem URLs to a slug that matches the backend's format.
 * Use this before checking if a problem exists in the sheet map.
 */
export function generateSlug(url: string | undefined | null): string {
  if (!url) return "";

  // 1. Clean the URL: lowercase, remove ? queries, and remove trailing slashes
  let clean = url.toString().toLowerCase().trim().split("?")[0];
  if (clean.endsWith("/")) clean = clean.slice(0, -1);

  // 2. Codeforces (Matches both contest and problemset URLs)
  if (clean.includes("codeforces.com")) {
    const match =
      clean.match(/contest\/(\d+)\/problem\/([a-z0-9]+)/) ||
      clean.match(/problem\/(\d+)\/([a-z0-9]+)/);
    if (match && match.length >= 3) return match[1] + match[2];
  }

  // 3. LeetCode
  if (clean.includes("leetcode.com")) {
    const parts = clean.split("/problems/");
    if (parts.length > 1)
      return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 4. HackerRank
  if (clean.includes("hackerrank.com")) {
    const parts = clean.split("/challenges/");
    if (parts.length > 1)
      return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 5. GeeksforGeeks (Strips out the /1 or /0 at the end of their URLs)
  if (clean.includes("geeksforgeeks.org")) {
    const parts = clean.split("/problems/");
    if (parts.length > 1)
      return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 6. CodeChef (Just in case A2SV uses it)
  if (clean.includes("codechef.com")) {
    const parts = clean.split("/problems/");
    if (parts.length > 1)
      return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 7. THE BULLETPROOF FALLBACK (For any other website)
  // Splits by "/", ignores empty spaces, grabs the very last meaningful word, and strips special characters
  const segments = clean.split("/").filter(Boolean);
  if (segments.length > 0) {
    return segments[segments.length - 1].replace(/[^a-z0-9]/g, "");
  }

  return "";
}

/**
 * Derive platform name from a problem URL (e.g. for folder paths).
 */
export function getPlatformFromUrl(url: string | undefined | null): string {
  if (!url) return "other";
  const lower = url.toString().toLowerCase().trim();
  if (lower.includes("codeforces.com")) return "codeforces";
  if (lower.includes("leetcode.com")) return "leetcode";
  if (lower.includes("hackerrank.com")) return "hackerrank";
  return "other";
}
