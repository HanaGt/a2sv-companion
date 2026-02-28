export const AuthEvent = {
  AUTHENTICATING: 'authenticating',
  AUTH_SUCCESS: 'authSuccess',
  AUTH_FAILURE: 'authFailure',
  CLOSE_AUTH_TAB: 'closeAuthTab',
};

export const LeetcodeEvent = {
  PUSH_TO_SHEETS: 'pushToSheets',
  PUSH_LAST_SUBMISSION_TO_SHEETS: 'pushLastSubmissionToSheets',
  WATCH_SUBMISSION_AND_PUSH: 'watchSubmissionAndPush',
  PUSH_TO_SHEETS_SUCCESS: 'pushToSheetsSuccess',
  PUSH_TO_SHEETS_FAILURE: 'pushToSheetsFailure',
};

export const CodeforcesEvent = {
  GET_LAST_SUBMISSION: 'getLastSubmissionId',
  PUSH_SUBMISSION_TO_SHEETS: 'pushSubmissionToSheets',
  PUSH_TO_SHEETS_SUCCESS: 'pushToSheetsSuccess',
  PUSH_TO_SHEETS_FAILURE: 'pushToSheetsFailure',
};

export const HackerRankEvent = {
  PUSH_SUBMISSION_TO_SHEETS: 'hackerRankPushSubmissionToSheets',
  PUSH_TO_SHEETS_SUCCESS: 'pushToSheetsSuccess',
  PUSH_TO_SHEETS_FAILURE: 'pushToSheetsFailure',
};
