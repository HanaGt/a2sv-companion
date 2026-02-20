import { CodeforcesEvent } from '../events';
import Codeforces from '../lib/codeforce/api';
import A2SV from '../lib/a2sv/';
import { CodeforcesSubmission } from '../lib/codeforce/types';
import { upload } from '../lib/github';
import { getCodeforcesLangExtenson } from '../utils/lang';

const LOG_PREFIX = '[A2SV Codeforces Service]';

const push = async (
  codeforcesHandle: string,
  submission: CodeforcesSubmission,
  timeTaken: number,
  code: string,
  questionUrl: string,
  onSuccess: () => void,
  onFailure: () => void
) => {
  console.log(LOG_PREFIX, 'push called', {
    codeforcesHandle,
    submissionId: submission.id,
    problemName: submission.problem.name,
    timeTaken,
    codeLength: code?.length,
  });

  chrome.storage.local
    .get(['selectedRepo', 'folderPath', 'studentName', 'group'])
    .then((result) => {
      const { selectedRepo, folderPath, studentName, group } = result;
      console.log(LOG_PREFIX, 'storage', {
        selectedRepo,
        folderPath,
        studentName,
        group,
      });

      const commitMsg = `Add solution for ${submission.problem.name}`;

      let path = '';
      if (folderPath) {
        if (folderPath[folderPath.length - 1] != '/') {
          path = folderPath + '/';
        }
      }

      let filename = `${submission.problem.contestId}${
        submission.problem.index
      } ${submission.problem.name.replace(
        ' ',
        '-'
      )}.${getCodeforcesLangExtenson(submission.programmingLanguage)}`;
      path += 'codeforces/' + filename;
      console.log(LOG_PREFIX, 'uploading to GitHub', { path, commitMsg });

      upload(selectedRepo, path, code, commitMsg).then((gitUrl) => {
        console.log(LOG_PREFIX, 'GitHub upload done', { gitUrl });
        Codeforces.getTries(codeforcesHandle, submission.id)
          .then(async (tries) => {
            console.log(LOG_PREFIX, 'getTries done', { tries });
            const pushed = await A2SV.pushToSheet({
              group: group || '',
              student_full_name: studentName || '',
              problem_url: questionUrl,
              github_link: gitUrl,
              attempts: tries,
              time: Number(timeTaken),
            });
            console.log(LOG_PREFIX, 'pushToSheet result', { pushed });
            if (pushed) onSuccess();
            else onFailure();
          })
          .catch((e) => {
            console.error(LOG_PREFIX, 'getTries or pushToSheet error', e);
            onFailure();
          });
      });
    });
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
  } else if (message.type === CodeforcesEvent.PUSH_SUBMISSION_TO_SHEETS) {
    console.log(LOG_PREFIX, 'PUSH_SUBMISSION_TO_SHEETS received');
    push(
      message.codeforcesHandle,
      message.submission,
      message.timeTaken,
      message.code,
      message.questionUrl,
      () => sendResponse(true),
      () => sendResponse(false)
    );
  }
};

export default codeforcesHandler;
