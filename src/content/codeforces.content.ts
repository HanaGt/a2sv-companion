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

/** Remove any "Push Last Submission" header button (legacy / cached script). */
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

const LOG_PREFIX = '[A2SV Codeforces]';

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
          alert('Failed to push to sheet!');
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
              else alert('Failed to push to sheet!');
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
