import { CodeforcesEvent } from '../events';
import CodeforccesAPI from '../lib/codeforce/api';
import { CodeforcesContentScript } from '../scripts';
import { getStoredMap } from '../lib/a2sv/map';
import { generateSlug } from '../utils/slug';
import { getLocalStorage, setProblemSubmitted } from '../utils/readStorage';
import type { SheetMap } from '../lib/a2sv/map';
import {
  addStatusTableHeaderColumn,
  addTimeInputToRow,
  getSubmissionAnchors,
  getSubmissionDetailWithoutModal,
  getSubmissionRows,
  getUserHandle,
  A2SV_PUSH_DATA,
  tryHandlePendingPushNavigation,
  fetchProblemStatement,
} from './codeforces/parseui';

const LOG_PREFIX = '[A2SV Codeforces]';

type PrefetchedSubmission = import('../lib/codeforce/types').CodeforcesSubmission;

function getRowForStudent(map: SheetMap, name: string): number | undefined {
  const key = name.trim();
  if (map.students[key] != null) return map.students[key];
  const lower = key.toLowerCase();
  const found = Object.keys(map.students).find((k) => k.toLowerCase() === lower);
  return found != null ? map.students[found] : undefined;
}

/** True only when the current Codeforces status/submissions view belongs to the logged-in user. */
const isOwnStatusPage = (): boolean => {
  const path = location.pathname || '';

  // Personal submissions page: /submissions/<handle>[/...]
  const submissionsMatch = path.match(/^\/submissions\/([^/]+)/);
  if (submissionsMatch) {
    try {
      const pageHandle = decodeURIComponent(submissionsMatch[1]);
      const currentHandle = getUserHandle();
      if (pageHandle && currentHandle && pageHandle === currentHandle) {
        return true;
      }
      return false;
    } catch {
      // If we can't read the user handle, treat as not-own to be safe.
      return false;
    }
  }

  // Contest "my" page: /contest/<id>/my
  if (/^\/contest\/\d+\/my\b/.test(path)) {
    return true;
  }

  // Pages with a "my" toggle (e.g. /problemset/status): require it to be checked.
  const myToggle = document.getElementsByName('my')[0] as HTMLInputElement | undefined;
  if (myToggle) {
    return myToggle.hasAttribute('checked') || myToggle.checked;
  }

  // For generic problemset status without explicit ownership, do NOT attach the table.
  if (/^\/problemset\/status/.test(path)) {
    return false;
  }

  // Default: allow enhancements on other pages.
  return true;
};

/** Push submission to sheets. Optimistic: validate locally, show Success, then hand off to background. */
const pushSubmission = async (
  submissionId: string,
  timeTaken: string,
  prefetched: { code: string; questionUrl: string },
  submissionFromApi?: PrefetchedSubmission | null
) => {
  console.log(LOG_PREFIX, 'pushSubmission started', { submissionId, timeTaken });
  try {
    const { code, questionUrl } = prefetched;
    if (!code || code.length === 0) {
      alert('No source code could be read from the submission. Try again.');
      return;
    }
    if (/\[A2SV Codeforces( Service)?\].*push called/.test(code) || (/\[A2SV Codeforces/.test(code) && /codeLength:\s*\d+/.test(code))) {
      console.error(LOG_PREFIX, 'Rejected: content looks like a log, not source code');
      alert('Source code could not be read (got invalid content). Try again.');
      return;
    }

    const studentName = (await getLocalStorage('studentName')) as string | undefined;
    const group = (await getLocalStorage('group')) as string | undefined;
    if (!studentName?.trim()) {
      alert('Set your name in the extension popup.');
      return;
    }

    const stored = await getStoredMap();
    // 1. Get the current URL and convert it to a slug
    const currentUrl = questionUrl;
    const urlSlug = generateSlug(currentUrl);
    // 2. Create a fallback text version (for text-only spreadsheet cells)
    const squishedSlug = urlSlug.replace(/[^a-z0-9]/g, '');
    // 3. Look up column/row if map exists (otherwise we still push to GitHub only)
    const col_index = stored?.map ? (stored.map.problems[urlSlug] ?? stored.map.problems[squishedSlug]) : undefined;
    const row_index = stored?.map ? getRowForStudent(stored.map, studentName) : undefined;
    const hasCoordinates = row_index != null && col_index != null;

    const [submission, problemStatement] = await Promise.all([
      submissionFromApi ?? CodeforccesAPI.getSubmission(getUserHandle(), parseInt(submissionId)),
      fetchProblemStatement(questionUrl),
    ]);
    console.log(LOG_PREFIX, 'getSubmission done', { problemName: submission?.problem?.name });

    // 5. Proceed to send payload (including col_index) to background.js
    if (hasCoordinates) {
      alert('Success!');
      setProblemSubmitted('codeforces', urlSlug).catch(() => {});
      chrome.runtime.sendMessage(
        {
          from: CodeforcesContentScript,
          type: CodeforcesEvent.PUSH_SUBMISSION_TO_SHEETS,
          codeforcesHandle: getUserHandle(),
          code,
          timeTaken,
          questionUrl,
          submission,
          row_index,
          col_index,
          group: group || '',
          student_full_name: studentName.trim(),
          problemStatement: problemStatement.statement || problemStatement.timeLimit || problemStatement.memoryLimit
            ? {
                timeLimit: problemStatement.timeLimit,
                memoryLimit: problemStatement.memoryLimit,
                statement: problemStatement.statement,
              }
            : undefined,
        },
        (response: { success: boolean; message: string } | boolean) => {
          const result = typeof response === 'object' && response !== null && 'message' in response
            ? response
            : { success: !!response, message: response ? 'Pushed to sheet!' : 'Failed to push!' };
          console.log(LOG_PREFIX, 'push result', result);
        }
      );
      return;
    }

    chrome.runtime.sendMessage(
      {
        from: CodeforcesContentScript,
        type: CodeforcesEvent.PUSH_SUBMISSION_TO_SHEETS,
        codeforcesHandle: getUserHandle(),
        code,
        timeTaken,
        questionUrl,
        submission,
        group: group || '',
        student_full_name: studentName.trim(),
        problemStatement: problemStatement.statement || problemStatement.timeLimit || problemStatement.memoryLimit
          ? {
              timeLimit: problemStatement.timeLimit,
              memoryLimit: problemStatement.memoryLimit,
              statement: problemStatement.statement,
            }
          : undefined,
      },
      (response: { success: boolean; message: string; githubOnly?: boolean } | boolean) => {
        const result = typeof response === 'object' && response !== null && 'message' in response
          ? response
          : { success: !!response, message: response ? 'Pushed to sheet!' : 'Failed to push!' };
        console.log(LOG_PREFIX, 'push result', result);
        if (result && typeof result === 'object' && (result.success || result.githubOnly)) {
          setProblemSubmitted('codeforces', urlSlug).catch(() => {});
        }
        if (result && typeof result === 'object' && result.githubOnly) {
          alert('Pushed to GitHub. If this problem is on the sheet, sync and try again.');
        } else if (result && typeof result === 'object' && !result.success) {
          alert(result.message || 'Failed to push.');
        }
      }
    );
  } catch (e) {
    console.error(LOG_PREFIX, 'pushSubmission error', e);
    alert('Failed to push submission.');
  }
};

/** Intercept view-source clicks: use time from table column, fetch without opening modal, then push. No prompt — table field is the single source of time. */
const hookSubmissionAnchors = () => {
  if (!isOwnStatusPage()) return;
  const solutionAnchors = getSubmissionAnchors();

  for (const anchor of solutionAnchors) {
    anchor.addEventListener('click', async (e) => {
      const submissionId = anchor.getAttribute('submissionid');
      if (!submissionId) return;

      const row = anchor.closest('tr') as HTMLTableRowElement | null;
      if (!row) return;

      const timeInputEl = row.querySelector<HTMLInputElement>('td input[type="number"]');
      const timeTaken = timeInputEl?.value?.trim();
      if (!timeTaken) return; // no prompt: use table only; let default view-source happen

      e.preventDefault();
      e.stopPropagation();

      try {
        const prefetched = await getSubmissionDetailWithoutModal(row, submissionId, timeTaken);
        await pushSubmission(submissionId, timeTaken, prefetched);
      } catch (err) {
        console.error(LOG_PREFIX, 'view-source push failed', err);
        alert('Failed to get submission. Try again.');
      }
    });
  }
};

const addTimeInputsToSubmissions = () => {
  if (!isOwnStatusPage()) return;
  addStatusTableHeaderColumn();
  const rows = getSubmissionRows();
  for (const row of rows) {
    addTimeInputToRow(row, async (submissionId, timeTaken) => {
      console.log(LOG_PREFIX, 'Submit from row', { submissionId, timeTaken });
      const targetRow =
        getSubmissionRows().find((r) => r.getAttribute('data-submission-id') === submissionId) ?? row;
      try {
        const prefetched = await getSubmissionDetailWithoutModal(
          targetRow,
          submissionId,
          timeTaken
        );
        await pushSubmission(submissionId, timeTaken, prefetched);
      } catch (e) {
        console.error(LOG_PREFIX, 'Push from row failed', e);
        alert('Failed to get submission. Try opening the submission and push again.');
      }
    });
  }
};

/** Observe DOM so time input + push button appear when a submission becomes Accepted without refresh. */
const observeStatusTable = () => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleAdd = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      addTimeInputsToSubmissions();
    }, 300);
  };
  const observer = new MutationObserver(() => scheduleAdd());
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleAdd();
};

/** When we navigated to a submission page to read source (contest/my fallback), read and go back. */
if (/\/submission\/\d+/.test(location.pathname)) {
  tryHandlePendingPushNavigation();
}

/** When we came back from that submission page, push the stored data. */
const applyStoredPushData = () => {
  try {
    const raw = sessionStorage.getItem(A2SV_PUSH_DATA);
    if (!raw) return;
    sessionStorage.removeItem(A2SV_PUSH_DATA);
    const { code, questionUrl, timeTaken, submissionId } = JSON.parse(raw);
    if (code && questionUrl && timeTaken && submissionId) {
      pushSubmission(submissionId, timeTaken, { code, questionUrl });
    }
  } catch {
    sessionStorage.removeItem(A2SV_PUSH_DATA);
  }
};
window.addEventListener('pageshow', applyStoredPushData);
applyStoredPushData(); // in case we missed pageshow (e.g. first load with bfcache)

hookSubmissionAnchors();
addTimeInputsToSubmissions();
observeStatusTable();
