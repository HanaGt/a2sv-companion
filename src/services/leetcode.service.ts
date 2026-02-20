import { LeetcodeEvent } from '../events';
import a2sv from '../lib/a2sv';
import { upload } from '../lib/github';
import Leetcode from '../lib/leetcode/api';
import { getLeetcodeLangExtension } from '../utils/lang';

const push = async (message: any, sendResponse: (response?: any) => void) => {
  try {
    const { submissionId, timeTaken, repo, studentName, group } = message;
    const { question, lang, code, timestamp } =
      await Leetcode.getSubmissionDetails(submissionId);

    const tries = await Leetcode.getTries(question.titleSlug);

    const ext = getLeetcodeLangExtension(lang.name);

    const folderPath =
      message.folderPath[message.folderPath.length - 1] == '/'
        ? message.folderPath
        : `${message.folderPath}/`;
    const fileRelativePath = `${folderPath}leetcode/${question.titleSlug}.${ext}`;
    const problemUrl = `https://leetcode.com/problems/${question.titleSlug}`;

    const gitUrl = await upload(
      repo,
      fileRelativePath,
      code,
      `Add solution for ${question.title}`
    );
    await a2sv.pushToSheet({
      group: message.group || '',
      student_full_name: studentName || '',
      problem_url: problemUrl,
      github_link: gitUrl,
      attempts: tries,
      time: Number(timeTaken),
    });
    sendResponse({ status: 'success' });
  } catch (e) {
    sendResponse({ error: e.message });
  }
};

const POLL_INTERVAL_MS = 2500;
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
    const submissionId = await Leetcode.getLastAcceptedSubmissionId(questionSlug);
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

  Leetcode.getLastAcceptedSubmissionId(questionSlug).then((id) => {
    previousAcceptedId = id;
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
    const { questionSlug, timeTaken } = message;
    chrome.storage.local
      .get(['selectedRepo', 'folderPath', 'studentName', 'group'])
      .then((storage) => {
        Leetcode.getLastAcceptedSubmissionId(questionSlug).then(
          (submissionId): void => {
            push(
              {
                submissionId,
                timeTaken,
                repo: storage.selectedRepo,
                folderPath: storage.folderPath,
                studentName: storage.studentName,
                group: storage.group,
              },
              sendResponse
            );
          }
        );
      });
  } else if (message.type === LeetcodeEvent.WATCH_SUBMISSION_AND_PUSH) {
    const { questionSlug, startTime } = message;
    watchSubmissionAndPush(questionSlug, startTime, sendResponse);
  }
};

export default leetcodeHandler;
