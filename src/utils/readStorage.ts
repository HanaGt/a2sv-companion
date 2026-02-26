export const getLocalStorage = (key: string) => {
  return new Promise<any>((resolve, _) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
};

const SUBMITTED_PROBLEMS_KEY = 'a2svSubmittedProblems';

export async function getSubmittedProblems(): Promise<Record<string, boolean>> {
  const raw = await getLocalStorage(SUBMITTED_PROBLEMS_KEY);
  return typeof raw === 'object' && raw !== null ? raw : {};
}

export async function setProblemSubmitted(platform: string, slug: string): Promise<void> {
  const key = `${platform}:${slug}`;
  const current = await getSubmittedProblems();
  current[key] = true;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SUBMITTED_PROBLEMS_KEY]: current }, resolve);
  });
}
