/**
 * Background-only sheet delivery: POST with coordinates.
 * Handles: success (log), busy (~3s retry), SYNC_REQUIRED (re-fetch map, resend), error (Chrome notification).
 */
import {
  pushToSheetWithCoordinates,
  SheetPayloadWithCoordinates,
  SheetPostResponse,
} from "../lib/a2sv";
import { getStoredMap, setStoredMap, fetchMap, clearStoredMap } from "../lib/a2sv/map";

const LOG = "[A2SV SheetDelivery]";
const BUSY_RETRY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showErrorNotification(message: string): void {
  chrome.notifications.create(undefined, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon_128.png"),
    title: "A2SV Companion",
    message:
      message ||
      "We had a tiny hiccup saving to the tracker. Please sync in the extension and try one more push!",
  });
}

export interface DeliverWithRetryOptions {
  /** When true, errors are not shown via Chrome notification (caller will show in UI, e.g. manual submit modal). */
  skipNotification?: boolean;
}

/**
 * Deliver one payload. Handles:
 * - success: log and return
 * - busy: wait ~3s, resend same payload
 * - SYNC_REQUIRED: re-fetch map, get new row_index, resend
 * - error: show Chrome notification unless skipNotification (student may have closed the tab)
 */
export async function deliverWithRetry(
  payload: SheetPayloadWithCoordinates,
  options: DeliverWithRetryOptions = {}
): Promise<void> {
  const { skipNotification = false } = options;
  let currentPayload: SheetPayloadWithCoordinates = { ...payload };

  for (;;) {
    const result = await pushToSheetWithCoordinates(currentPayload);
    const json: SheetPostResponse = result.json;

    if (json?.status === "success") {
      console.log(LOG, "Write successful");
      return;
    }

    if (json?.code === "SYNC_REQUIRED") {
      console.warn(LOG, "SYNC_REQUIRED: re-fetching map and resending");
      const map = await fetchMap(payload.group);
      if (map) {
        await setStoredMap(map, payload.group);
        const row = map.students[payload.student_full_name];
        if (row != null) {
          currentPayload = { ...currentPayload, row_index: row };
          continue;
        }
      }
      await clearStoredMap();
      const syncMsg =
        "Brilliant work! An instructor just updated the spreadsheet. Please do a quick sync in the extension to record your success!";
      if (!skipNotification) showErrorNotification(syncMsg);
      throw new Error(syncMsg);
    }

    if (json?.status === "busy") {
      console.log(LOG, "Backend busy, retry in", BUSY_RETRY_MS, "ms");
      await sleep(BUSY_RETRY_MS);
      continue;
    }

    // status: "error" or other failure
    console.error(LOG, "Delivery failed", json);
    const message =
      json?.message ||
      "Great effort on this problem! We had a tiny hiccup saving it to the tracker. Please ensure your name is matched correctly and try one more push!";
    if (!skipNotification) showErrorNotification(message);
    throw new Error(message);
  }
}
