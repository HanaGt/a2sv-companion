import { CodeforcesEvent } from '../events';
import Codeforces from '../lib/codeforce/api';
import type { SheetPayloadWithCoordinates } from '../lib/a2sv';
import { getStoredMap } from '../lib/a2sv/map';
import { CodeforcesSubmission } from '../lib/codeforce/types';
import { upload } from '../lib/github';
import { getCodeforcesLangExtenson } from '../utils/lang';
import { generateSlug } from '../utils/slug';
import { buildCodeforcesReadme } from '../utils/readme';
import { deliverWithRetry } from './sheetDelivery.service';

const LOG_PREFIX = '[A2SV Codeforces Service]';

/** Folder name for a Codeforces problem (same style as LeetCode: id + slug). e.g. 1214B-Polycarp-Training */
function codeforcesDirName(problem: { contestId: number; index: string; name: string }): string {
  const slug = problem.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  return `${problem.contestId}${problem.index}-${slug || 'solution'}`;
}

function getRowForStudent(map: { students: Record<string, number> }, name: string): number | undefined {
  const key = name.trim();
  if (map.students[key] != null) return map.students[key];
  const found = Object.keys(map.students).find((k) => k.toLowerCase() === key.toLowerCase());
  return found != null ? map.students[found] : undefined;
}

const doPushGitHubOnly = async (
  submission: CodeforcesSubmission,
  code: string,
  problemStatement?: { timeLimit?: string; memoryLimit?: string; statement?: string }
): Promise<void> => {
  const { selectedRepo, folderPath } = await new Promise<{ selectedRepo?: string; folderPath?: string }>((resolve) => {
    chrome.storage.local.get(['selectedRepo', 'folderPath'], resolve);
  });
  const base = (folderPath && folderPath[folderPath.length - 1] !== '/') ? folderPath + '/' : folderPath || '';
  const dirName = codeforcesDirName(submission.problem);
  const basePath = `${base}codeforces/${dirName}`;
  const ext = getCodeforcesLangExtenson(submission.programmingLanguage);
  const codeFileName = `${dirName}.${ext}`;
  const codeRelativePath = `${basePath}/${codeFileName}`;
  const readmeRelativePath = `${basePath}/README.md`;

  const questionUrl = `https://codeforces.com/contest/${submission.problem.contestId}/problem/${submission.problem.index}`;
  const readmeContent = buildCodeforcesReadme({
    contestId: submission.problem.contestId,
    index: submission.problem.index,
    name: submission.problem.name,
    questionUrl,
    timeLimit: problemStatement?.timeLimit,
    memoryLimit: problemStatement?.memoryLimit,
    problemStatement: problemStatement?.statement,
  });

  await upload(selectedRepo || '', readmeRelativePath, readmeContent, `Add README for ${submission.problem.name}`);
  await upload(selectedRepo || '', codeRelativePath, code, `Add solution for ${submission.problem.name}`);
};

const doPush = async (
  codeforcesHandle: string,
  submission: CodeforcesSubmission,
  timeTaken: number,
  code: string,
  questionUrl: string,
  row_index: number,
  col_index: number,
  group: string,
  student_full_name: string,
  problemStatement?: { timeLimit?: string; memoryLimit?: string; statement?: string }
): Promise<void> => {
  const { selectedRepo, folderPath } = await new Promise<{ selectedRepo?: string; folderPath?: string }>((resolve) => {
    chrome.storage.local.get(['selectedRepo', 'folderPath'], resolve);
  });
  const base = (folderPath && folderPath[folderPath.length - 1] !== '/') ? folderPath + '/' : folderPath || '';
  const dirName = codeforcesDirName(submission.problem);
  const basePath = `${base}codeforces/${dirName}`;
  const ext = getCodeforcesLangExtenson(submission.programmingLanguage);
  const codeFileName = `${dirName}.${ext}`;
  const codeRelativePath = `${basePath}/${codeFileName}`;
  const readmeRelativePath = `${basePath}/README.md`;

  const readmeContent = buildCodeforcesReadme({
    contestId: submission.problem.contestId,
    index: submission.problem.index,
    name: submission.problem.name,
    questionUrl,
    timeLimit: problemStatement?.timeLimit,
    memoryLimit: problemStatement?.memoryLimit,
    problemStatement: problemStatement?.statement,
  });

  await upload(selectedRepo || '', readmeRelativePath, readmeContent, `Add README for ${submission.problem.name}`);
  const gitUrl = await upload(selectedRepo || '', codeRelativePath, code, `Add solution for ${submission.problem.name}`);
  const tries = await Codeforces.getTries(codeforcesHandle, submission.id);
  const payload: SheetPayloadWithCoordinates = {
    group,
    student_full_name,
    problem_url: questionUrl,
    github_link: gitUrl,
    attempts: tries,
    time: Number(timeTaken),
    row_index,
    col_index,
  };
  await deliverWithRetry(payload);
};

const codeforcesHandler = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (message.type === CodeforcesEvent.GET_LAST_SUBMISSION) {
    Codeforces.getLastSubmission(message.codeforcesHandle).then(
      (submission) => {
        sendResponse(submission);
      }
    );
    return true;
  }
  if (message.type === CodeforcesEvent.PUSH_SUBMISSION_TO_SHEETS) {
    console.log(LOG_PREFIX, 'PUSH_SUBMISSION_TO_SHEETS received');
    const code = message.code;
    if (!code || typeof code !== 'string' || code.length === 0) {
      sendResponse({ success: false, message: 'No code received. Try opening the submission and push again.' });
      return true;
    }
    const hasCoordinates = typeof message.row_index === 'number' && typeof message.col_index === 'number';
    if (hasCoordinates) {
      sendResponse({ success: true, message: 'Pushed to sheet!' });
      doPush(
        message.codeforcesHandle,
        message.submission,
        message.timeTaken,
        code,
        message.questionUrl,
        message.row_index,
        message.col_index,
        message.group || '',
        message.student_full_name || '',
        message.problemStatement
      ).catch((e) => {
        console.error(LOG_PREFIX, 'background delivery error', e);
      });
      return true;
    }
    (async () => {
      const stored = await getStoredMap();
      const { studentName, group } = await new Promise<{ studentName?: string; group?: string }>((r) => {
        chrome.storage.local.get(['studentName', 'group'], r);
      });
      const student_full_name = (studentName || message.student_full_name || '').trim();
      let row_index: number | undefined;
      let col_index: number | undefined;
      if (stored?.map && student_full_name) {
        const urlSlug = generateSlug(message.questionUrl);
        const squishedSlug = urlSlug.replace(/[^a-z0-9]/g, '');
        row_index = getRowForStudent(stored.map, student_full_name);
        col_index = stored.map.problems[urlSlug] ?? stored.map.problems[squishedSlug];
      }
      try {
        if (row_index != null && col_index != null) {
          await doPush(
            message.codeforcesHandle,
            message.submission,
            message.timeTaken,
            code,
            message.questionUrl,
            row_index,
            col_index,
            group || message.group || '',
            student_full_name,
            message.problemStatement
          );
          sendResponse({ success: true, message: 'Pushed to sheet!' });
        } else {
          await doPushGitHubOnly(message.submission, code, message.problemStatement);
          sendResponse({ success: true, message: 'Pushed to GitHub.', githubOnly: true });
        }
      } catch (e) {
        sendResponse({ success: false, message: e instanceof Error ? e.message : 'Request failed' });
      }
    })();
    return true;
  }
};

export default codeforcesHandler;
