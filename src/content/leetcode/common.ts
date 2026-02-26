/**
 * Universal slug generator for local validation.
 * Takes any problem URL (LeetCode, Codeforces, HackerRank, etc.) and returns
 * the same key format used in the backend HashMap. Use this before looking up
 * map.problems[slug].
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
    console.log("parts leetcode", parts[1].split("/")[0].replace(/[^a-z0-9]/g,""));
    if (parts.length > 1) return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 4. HackerRank
  if (clean.includes("hackerrank.com")) {
    const parts = clean.split("/challenges/");
    if (parts.length > 1) return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 5. GeeksforGeeks (Strips out the /1 or /0 at the end of their URLs)
  if (clean.includes("geeksforgeeks.org")) {
    const parts = clean.split("/problems/");
    if (parts.length > 1) return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 6. CodeChef (Just in case A2SV uses it)
  if (clean.includes("codechef.com")) {
    const parts = clean.split("/problems/");
    if (parts.length > 1) return parts[1].split("/")[0].replace(/[^a-z0-9]/g, "");
  }

  // 7. THE BULLETPROOF FALLBACK (For any other website)
  const segments = clean.split("/").filter(Boolean);
  if (segments.length > 0) {
    return segments[segments.length - 1].replace(/[^a-z0-9]/g, "");
  }

  return "";
}

export const getLeetcodeVersion = () => {
  if (document.getElementById('__next')) return 'NEW';
  return 'OLD';
};

export const removeContent = (
  observer: MutationObserver,
  observe: () => void
) => {
  observer.disconnect();
  document.getElementById('push-to-sheets-btn')?.remove();
  document.getElementById('time-taken-field')?.remove();
  observe();
};
