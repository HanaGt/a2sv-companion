export interface LeetcodeSubmissionStatus {
  id: string;
  status: string;
  timestamp: string;
  statusDisplay: string;
}

export interface LeecodeSubmissionDetail {
  question: { titleSlug: string; title: string };
  lang: { name: string };
  code: string;
  timestamp: string;
}

/** Full question details for README (from GraphQL question query). */
export interface LeetcodeQuestionDetails {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  content: string;
}
