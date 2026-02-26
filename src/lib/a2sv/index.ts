import config from '../../config';

export interface SheetPayload {
  group: string;
  student_full_name: string;
  problem_url: string;
  github_link: string;
  attempts: number;
  time: number;
}

/** Payload for POST with exact coordinates (optimistic UI handoff). */
export interface SheetPayloadWithCoordinates extends SheetPayload {
  row_index: number;
  col_index: number;
}

/** Backend JSON responses for POST (success, busy, SYNC_REQUIRED, error). */
export interface SheetPostResponse {
  status?: string;
  code?: string;
  message?: string;
}

export interface PushToSheetResult {
  success: boolean;
  message: string;
}

/**
 * POST to Apps Script with coordinates. Uses Content-Type: text/plain;charset=utf-8
 * to avoid CORS preflight (Apps Script rejects OPTIONS).
 * Call from background script only.
 */
export async function pushToSheetWithCoordinates(
  payload: SheetPayloadWithCoordinates
): Promise<{ ok: boolean; json: SheetPostResponse }> {
  const row_index = Number(payload.row_index);
  const col_index = Number(payload.col_index);
  if (!Number.isFinite(row_index) || !Number.isFinite(col_index)) {
    return {
      ok: false,
      json: { status: 'error', message: 'Missing or null fields: row_index, col_index' },
    };
  }
  const body = {
    group: payload.group,
    student_full_name: payload.student_full_name,
    problem_url: payload.problem_url,
    github_link: payload.github_link,
    attempts: String(payload.attempts),
    time: String(payload.time),
    row_index,
    col_index,
  };
  const bodyStr = JSON.stringify(body);
  try {
    const response = await fetch(config.sheet.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyStr,
    });
    const text = await response.text();
    let json: SheetPostResponse = {};
    try {
      json = JSON.parse(text) as SheetPostResponse;
    } catch {
      if (text) json = { message: text };
    }
    return { ok: response.ok, json };
  } catch (err) {
    console.error('[A2SV] POST failed:', err);
    return {
      ok: false,
      json: { status: 'error', message: err instanceof Error ? err.message : 'Request failed' },
    };
  }
}

const pushToSheet = async (payload: SheetPayload): Promise<PushToSheetResult> => {
  const body = {
    group: payload.group,
    student_full_name: payload.student_full_name,
    problem_url: payload.problem_url,
    github_link: payload.github_link,
    attempts: String(payload.attempts),
    time: String(payload.time),
  };
  console.log('A2SV submit (sent JSON):', JSON.stringify(body, null, 2));
  try {
    const response = await fetch(config.sheet.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let success = response.ok;
    let message = success ? 'Pushed to sheet!' : 'Failed to push.';
    try {
      const json = JSON.parse(text) as { status?: string; message?: string };
      if (json.message) message = json.message;
      if (json.status === 'error') success = false;
    } catch {
      if (!success && text) message = text;
    }
    return { success, message };
  } catch (err) {
    console.error('A2SV submit (Apps Script failed):', err);
    return { success: false, message: err instanceof Error ? err.message : 'Request failed' };
  }
};

export default { pushToSheet, pushToSheetWithCoordinates };
