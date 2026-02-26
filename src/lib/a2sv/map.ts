/**
 * Sheet map: local source of truth for problem → col_index and student → row_index.
 * Fetched via GET ?group=G71 and stored in chrome.storage.local.
 */
import config from "../../config";

export interface SheetMap {
  /** slug (from generateSlug) → column index in sheet */
  problems: Record<string, number>;
  /** student full name → row index in sheet */
  students: Record<string, number>;
  /**
   * Solved problems for each student, keyed by row index (as a string) → list of problem column indices.
   * Example:
   * solved: { "6": [5, 12, 15], "7": [5] }
   */
  solved?: Record<string, number[]>;
}

const STORAGE_KEY = "sheetMap";
const STORAGE_KEY_GROUP = "sheetMapGroup";

export function getStoredMap(): Promise<{ map: SheetMap; group: string } | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY, STORAGE_KEY_GROUP], (result) => {
      const map = result[STORAGE_KEY] as SheetMap | undefined;
      const group = result[STORAGE_KEY_GROUP] as string | undefined;
      if (map && map.problems && map.students && group) {
        resolve({ map, group });
        return;
      }
      resolve(null);
    });
  });
}

export function setStoredMap(map: SheetMap, group: string): Promise<void> {
  return chrome.storage.local.set({
    [STORAGE_KEY]: map,
    [STORAGE_KEY_GROUP]: group,
  });
}

export function clearStoredMap(): Promise<void> {
  return chrome.storage.local.remove([STORAGE_KEY, STORAGE_KEY_GROUP]);
}

/**
 * Fetch sheet map for a group from the Apps Script endpoint.
 * GET {sheet.url}?group=G71 → response.data is the map.
 */
export async function fetchMap(group: string): Promise<SheetMap | null> {
  if (!group || !group.trim()) return null;
  const url = `${config.sheet.url}?group=${encodeURIComponent(group.trim())}`;
  try {
    const response = await fetch(url, { method: "GET" });
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("[A2SV map] Response was not JSON:", text?.slice(0, 200));
      return null;
    }
    const map = (data as { data?: SheetMap }).data;
    if (map && typeof map.problems === "object" && typeof map.students === "object") {
      return map;
    }
    console.warn("[A2SV map] Response missing .data.problems or .data.students");
    return null;
  } catch (err) {
    console.error("[A2SV map] Fetch failed:", err);
    return null;
  }
}

/**
 * Fetch map for group and save to chrome.storage.local.
 * Returns the map or null on failure.
 */
export async function syncMapForGroup(group: string): Promise<SheetMap | null> {
  const map = await fetchMap(group);
  if (map) {
    await setStoredMap(map, group.trim());
  }
  return map;
}
