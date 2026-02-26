export interface SubmissionRequest {
  studentName: string;
  attempts: number;
  timeTaken: number;
  questionUrl: string;
  platform: 'Codeforces' | 'LeetCode';
  gitUrl: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface ValidationError {
  error: string;
  details: string[];
}