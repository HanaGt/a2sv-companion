import { LeetcodeSubmissionStatus, LeecodeSubmissionDetail, LeetcodeQuestionDetails } from './types';

const leetcodeRequest = async (body: any) => {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  });

  if (response.status == 200) {
    return (await response.json()).data;
  }

  return null;
};

const getSubmissions = async (
  questionSlug: string
): Promise<LeetcodeSubmissionStatus[]> => {
  const graphQL = JSON.stringify({
    variables: { questionSlug: questionSlug, offset: 0, limit: 40 },
    query:
      'query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!, $lang: Int, $status: Int) { questionSubmissionList( offset: $offset limit: $limit lastKey: $lastKey questionSlug: $questionSlug lang: $lang status: $status ) { lastKey hasNext submissions {id status timestamp statusDisplay} } }',
  });

  const data = await leetcodeRequest(graphQL);

  if (data) {
    const submissions = data.questionSubmissionList
      .submissions as LeetcodeSubmissionStatus[];
    submissions.sort((a, b) => {
      return parseInt(b.timestamp) - parseInt(a.timestamp);
    });

    return submissions;
  }

  return [];
};

const getLastAcceptedSubmissionId = async (
  questionSlug: string
): Promise<number | null> => {
  const submissions = await getSubmissions(questionSlug);

  for (let submission of submissions) {
    if (submission.statusDisplay === 'Accepted') {
      return parseInt(submission.id);
    }
  }

  return null;
};

const getSubmissionDetails = async (
  submissionId: number
): Promise<LeecodeSubmissionDetail> => {
  const graphQL = JSON.stringify({
    variables: { submissionId: submissionId },
    query:
      'query submissionDetails($submissionId: Int!) { submissionDetails(submissionId: $submissionId) { timestamp code lang { name } question { titleSlug title }} }',
  });

  const data = (await leetcodeRequest(graphQL))
    .submissionDetails as LeecodeSubmissionDetail;

  return data;
};

const getTries = async (questionSlug: string) => {
  const { tries } = await getSubmissionsWithMeta(questionSlug);
  return tries;
};

/** One call: submission list + last accepted id + tries. Use instead of getLastAcceptedSubmissionId + getTries. */
const getSubmissionsWithMeta = async (
  questionSlug: string
): Promise<{ lastAcceptedId: number | null; tries: number }> => {
  const submissions = await getSubmissions(questionSlug);
  let lastAcceptedId: number | null = null;
  let minAccepted = Infinity;

  for (const s of submissions) {
    if (s.statusDisplay === 'Accepted') {
      const ts = parseInt(s.timestamp, 10);
      if (ts < minAccepted) minAccepted = ts;
      if (lastAcceptedId === null) lastAcceptedId = parseInt(s.id, 10);
    }
  }

  let tries = 0;
  for (const s of submissions) {
    if (parseInt(s.timestamp, 10) < minAccepted) tries++;
  }
  if (minAccepted !== Infinity) tries += 1;

  return { lastAcceptedId, tries: minAccepted === Infinity ? 0 : tries };
};

/** Fetch full question details for README (title, difficulty, content). */
const getQuestionDetails = async (
  titleSlug: string
): Promise<LeetcodeQuestionDetails | null> => {
  const graphQL = JSON.stringify({
    variables: { titleSlug },
    query:
      'query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title titleSlug difficulty content } }',
  });
  const data = await leetcodeRequest(graphQL);
  return data?.question ?? null;
};

export default {
  getSubmissions,
  getSubmissionDetails,
  getLastAcceptedSubmissionId,
  getTries,
  getSubmissionsWithMeta,
  getQuestionDetails,
};
