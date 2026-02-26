import { LeetcodeEvent } from '../events';
import type { SheetPayloadWithCoordinates } from '../lib/a2sv';
import { getStoredMap } from '../lib/a2sv/map';
import { upload } from '../lib/github';
import Leetcode from '../lib/leetcode/api';
import { getLeetcodeLangExtension } from '../utils/lang';
import { generateSlug } from '../utils/slug';
import { buildLeetcodeReadme, buildMinimalReadme } from '../utils/readme';
import { deliverWithRetry } from './sheetDelivery.service';

/** LeetHub-style folder name: e.g. 0001-two-sum */
function leethubFolderName(questionFrontendId: string, titleSlug: string): string {
  const id = String(questionFrontendId).padStart(4, '0');
  return `${id}-${titleSlug}`;
}

function getRowForStudent(map: { students: Record<string, number> }, name: string): number | undefined {
  const key = name.trim();
  if (map.students[key] != null) return map.students[key];
  const lower = key.toLowerCase();
  const found = Object.keys(map.students).find((k) => k.toLowerCase() === lower);
  return found != null ? map.students[found] : undefined;
}

const push = async (message: any, sendResponse: (response?: any) => void) => {
  try {
    let { submissionId, timeTaken, repo, studentName, group, row_index, col_index } = message;
    const { question, lang, code, timestamp } =
      await Leetcode.getSubmissionDetails(submissionId);

    const tries =
      message.tries != null
        ? message.tries
        : await Leetcode.getTries(question.titleSlug);

    const ext = getLeetcodeLangExtension(lang.name);

    const folderPath =
      message.folderPath[message.folderPath.length - 1] == '/'
        ? message.folderPath
        : `${message.folderPath}/`;
    const problemUrl = `https://leetcode.com/problems/${question.titleSlug}`;

    // LeetHub-style: one folder per problem with code file + README
    const questionDetails = await Leetcode.getQuestionDetails(question.titleSlug);
    const dirName = questionDetails
      ? leethubFolderName(questionDetails.questionFrontendId, question.titleSlug)
      : question.titleSlug;
    const basePath = `${folderPath}leetcode/${dirName}`;
    const codeFileName = `${dirName}.${ext}`;
    const codeRelativePath = `${basePath}/${codeFileName}`;
    const readmeRelativePath = `${basePath}/README.md`;

    const readmeContent = questionDetails
      ? buildLeetcodeReadme(questionDetails, problemUrl)
      : buildMinimalReadme(question.title, problemUrl);

    if (row_index == null || col_index == null) {
      const stored = await getStoredMap();
      if (stored?.map) {
        const urlSlug = generateSlug(problemUrl);
        const squishedSlug = urlSlug.replace(/[^a-z0-9]/g, '');
        row_index = getRowForStudent(stored.map, studentName || '');
        col_index = stored.map.problems[urlSlug] ?? stored.map.problems[squishedSlug];
      }
    }

    await upload(repo, readmeRelativePath, readmeContent, `Add README for ${question.title}`);
    const gitUrl = await upload(
      repo,
      codeRelativePath,
      code,
      `Add solution for ${question.title}`
    );

    if (row_index != null && col_index != null) {
      const payload: SheetPayloadWithCoordinates = {
        group: message.group || '',
        student_full_name: studentName || '',
        problem_url: problemUrl,
        github_link: gitUrl,
        attempts: tries,
        time: Number(timeTaken),
        row_index,
        col_index,
      };
      await deliverWithRetry(payload);
      sendResponse({ status: 'success' });
    } else {
      sendResponse({ status: 'success', githubOnly: true });
    }
  } catch (e) {
    sendResponse({ error: e.message });
  }
};

const POLL_INTERVAL_MS = 800;
const POLL_TIMEOUT_MS = 120000;

const watchSubmissionAndPush = (
  questionSlug: string,
  startTime: number,
  sendResponse: (response?: any) => void
) => {
  let previousAcceptedId: number | null = null;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  const poll = async () => {
    if (Date.now() > deadline) {
      sendResponse({ error: 'Timeout waiting for accepted submission' });
      return;
    }
    const { lastAcceptedId: submissionId, tries } =
      await Leetcode.getSubmissionsWithMeta(questionSlug);
    if (submissionId !== null && submissionId !== previousAcceptedId) {
      previousAcceptedId = submissionId;
      const timeTakenMinutes = (Date.now() - startTime) / 60000;
      chrome.storage.local
        .get(['selectedRepo', 'folderPath', 'studentName', 'group'])
        .then((storage) => {
          push(
            {
              submissionId,
              timeTaken: String(timeTakenMinutes.toFixed(1)),
              tries,
              repo: storage.selectedRepo,
              folderPath: storage.folderPath,
              studentName: storage.studentName,
              group: storage.group,
            },
            sendResponse
          );
        });
      return;
    }
    setTimeout(poll, POLL_INTERVAL_MS);
  };

  Leetcode.getSubmissionsWithMeta(questionSlug).then(({ lastAcceptedId }) => {
    previousAcceptedId = lastAcceptedId;
    setTimeout(poll, POLL_INTERVAL_MS);
  });
};

const leetcodeHandler = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (message.type === LeetcodeEvent.PUSH_TO_SHEETS) {
    push(message, sendResponse);
  } else if (message.type === LeetcodeEvent.PUSH_LAST_SUBMISSION_TO_SHEETS) {
    const { questionSlug, timeTaken, row_index, col_index, group, student_full_name } = message;
    const hasCoordinates = typeof row_index === 'number' && typeof col_index === 'number';

    if (hasCoordinates) {
      sendResponse({ status: 'success' });
      chrome.storage.local
        .get(['selectedRepo', 'folderPath', 'studentName', 'group'])
        .then(async (storage) => {
          const { lastAcceptedId, tries } =
            await Leetcode.getSubmissionsWithMeta(questionSlug);
          if (lastAcceptedId == null) return;
          push(
            {
              submissionId: lastAcceptedId,
              timeTaken,
              tries,
              repo: storage.selectedRepo,
              folderPath: storage.folderPath,
              studentName: storage.studentName ?? student_full_name,
              group: storage.group ?? group,
              row_index,
              col_index,
            },
            () => {}
          );
        })
        .catch(() => {});
      return true;
    }

    chrome.storage.local
      .get(['selectedRepo', 'folderPath', 'studentName', 'group'])
      .then(async (storage) => {
        const { lastAcceptedId, tries } =
          await Leetcode.getSubmissionsWithMeta(questionSlug);
        if (lastAcceptedId == null) {
          sendResponse({ error: 'No accepted submission found' });
          return;
        }
        push(
          {
            submissionId: lastAcceptedId,
            timeTaken,
            tries,
            repo: storage.selectedRepo,
            folderPath: storage.folderPath,
            studentName: storage.studentName,
            group: storage.group,
            row_index: undefined,
            col_index: undefined,
          },
          sendResponse
        );
      });
    return true;
  } else if (message.type === LeetcodeEvent.WATCH_SUBMISSION_AND_PUSH) {
    const { questionSlug, startTime } = message;
    watchSubmissionAndPush(questionSlug, startTime, sendResponse);
  }
};

export default leetcodeHandler;
