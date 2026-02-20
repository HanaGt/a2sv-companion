import { CodeforcesEvent } from '../events';
import CodeforccesAPI from '../lib/codeforce/api';
import { CodeforcesContentScript } from '../scripts';
import {
  addStatusTableHeaderColumn,
  addTimeInputToRow,
  getSubmissionAnchors,
  getSubmissionDetail,
  getSubmissionRows,
  getUserHandle,
} from './codeforces/parseui';

let pendingSubmissionTime: Record<string, string> = {};

/** Remove any legacy "Push Last Submission" header button (old placement). */
const removePushLastSubmissionButton = () => {
  const header = document.getElementById('header');
  if (!header) return;
  const buttons = header.getElementsByTagName('button');
  for (let i = buttons.length - 1; i >= 0; i--) {
    if (buttons[i].innerText?.includes('Push Last Submission')) {
      buttons[i].remove();
      break;
    }
  }
};

/** Add "Push Last Submission" bar above the status table (same as LeetCode flow → sheet API). */
const addPushLastSubmissionBar = () => {
  const rows = getSubmissionRows();
  if (rows.length === 0) return;
  const table = rows[0].closest('table');
  if (!table || table.querySelector('.a2sv-push-last-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'a2sv-push-last-bar';
  bar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 0;';
  const label = document.createElement('span');
  label.textContent = 'Push Last Submission:';
  label.style.marginRight = '4px';
  const timeInput = document.createElement('input');
  timeInput.type = 'number';
  timeInput.placeholder = 'Time (min)';
  timeInput.min = '0';
  timeInput.style.cssText = 'width:70px;padding:4px 6px;background:#f5f5f5;border:1px solid #ccc;border-radius:4px;color:#333;';
  const btn = document.createElement('button');
  btn.textContent = 'Push Last Submission';
  btn.type = 'button';
  btn.style.cssText = 'padding:6px 12px;background:#0d6efd;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;';

  btn.addEventListener('click', async () => {
    const timeTaken = timeInput.value.trim();
    if (!timeTaken) {
      alert('Enter time taken (min).');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Pushing...';
    try {
      const handle = getUserHandle();
      const submission = await CodeforccesAPI.getLastSubmission(handle);
      if (!submission) {
        alert('No accepted submission found.');
        btn.disabled = false;
        btn.textContent = 'Push Last Submission';
        return;
      }
      const submissionId = String(submission.id);
      const viewSourceAnchor = document.querySelector(
        `a.view-source[submissionid="${submissionId}"]`
      ) as HTMLAnchorElement;
      if (!viewSourceAnchor) {
        alert('Could not find submission row. Make sure the status table is visible.');
        btn.disabled = false;
        btn.textContent = 'Push Last Submission';
        return;
      }
      viewSourceAnchor.click();
      await waitForModal(8000);
      await pushSubmission(submissionId, timeTaken);
    } catch (e) {
      console.error(LOG_PREFIX, 'Push Last Submission error', e);
      alert('Failed to push last submission.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Push Last Submission';
    }
  });

  bar.appendChild(label);
  bar.appendChild(timeInput);
  bar.appendChild(btn);
  table.parentElement?.insertBefore(bar, table);
};

const LOG_PREFIX = '[A2SV Codeforces]';

/** Poll until the submission modal is visible (so getSubmissionDetail can read code). */
const waitForModal = (timeoutMs: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (document.getElementById('program-source-text-copy')) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error('Modal did not open in time'));
        return;
      }
      setTimeout(poll, 200);
    };
    poll();
  });
};

const pushSubmission = async (submissionId: string, timeTaken: string) => {
  console.log(LOG_PREFIX, 'pushSubmission started', { submissionId, timeTaken });
  try {
    const { code, questionUrl } = await getSubmissionDetail(
      submissionId,
      timeTaken
    );
    console.log(LOG_PREFIX, 'getSubmissionDetail done', { questionUrl, codeLength: code?.length });

    const submission = await CodeforccesAPI.getSubmission(
      getUserHandle(),
      parseInt(submissionId)
    );
    console.log(LOG_PREFIX, 'getSubmission done', { problemName: submission?.problem?.name });

    chrome.runtime.sendMessage(
      {
        from: CodeforcesContentScript,
        type: CodeforcesEvent.PUSH_SUBMISSION_TO_SHEETS,
        codeforcesHandle: getUserHandle(),
        code,
        timeTaken,
        questionUrl,
        submission,
      },
      (success) => {
        console.log(LOG_PREFIX, 'push result', success ? 'success' : 'failure');
        if (success) {
          alert('Pushed to sheet!');
        } else {
          alert('Failed to push!');
        }

        const closeBtn = document.getElementsByClassName('close')[0] as
          | HTMLAnchorElement
          | undefined;
        if (closeBtn) closeBtn.click();
      }
    );
  } catch (e) {
    console.error(LOG_PREFIX, 'pushSubmission error', e);
    return;
  }
};

const hookSubmissionAnchors = () => {
  const solutionAnchors = getSubmissionAnchors();

  for (const anchor of solutionAnchors) {
    anchor.addEventListener('click', async () => {
      const submissionId = anchor.getAttribute('submissionid');
      if (!submissionId) return;

      const preFilledTime = pendingSubmissionTime[submissionId];
      delete pendingSubmissionTime[submissionId];
      console.log(LOG_PREFIX, 'view-source clicked', { submissionId, preFilledTime: !!preFilledTime });

      try {
        if (preFilledTime) {
          await pushSubmission(submissionId, preFilledTime);
        } else {
          const { timeTaken, code, questionUrl } = await getSubmissionDetail(
            submissionId
          );
          const submission = await CodeforccesAPI.getSubmission(
            getUserHandle(),
            parseInt(submissionId)
          );
          chrome.runtime.sendMessage(
            {
              from: CodeforcesContentScript,
              type: CodeforcesEvent.PUSH_SUBMISSION_TO_SHEETS,
              codeforcesHandle: getUserHandle(),
              code,
              timeTaken,
              questionUrl,
              submission,
            },
            (success) => {
              console.log(LOG_PREFIX, 'push result (modal)', success ? 'success' : 'failure');
              if (success) alert('Pushed to sheet!');
              else alert('Failed to push!');
              const closeBtn = document.getElementsByClassName('close')[0] as
                | HTMLAnchorElement
                | undefined;
              if (closeBtn) closeBtn.click();
            }
          );
        }
      } catch (e) {
        return;
      }
    });
  }
};

const addTimeInputsToSubmissions = () => {
  addStatusTableHeaderColumn();
  const rows = getSubmissionRows();
  for (const row of rows) {
    addTimeInputToRow(row, (submissionId, timeTaken) => {
      console.log(LOG_PREFIX, 'Submit from row', { submissionId, timeTaken });
      pendingSubmissionTime[submissionId] = timeTaken;
      const anchor = row.querySelector(
        `a.view-source[submissionid="${submissionId}"]`
      ) as HTMLAnchorElement;
      if (anchor) anchor.click();
    });
  }
};

removePushLastSubmissionButton();
hookSubmissionAnchors();
addTimeInputsToSubmissions();
addPushLastSubmissionBar();
