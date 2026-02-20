import config from '../../config';

export interface SheetPayload {
  group: string;
  student_full_name: string;
  problem_url: string;
  github_link: string;
  attempts: number;
  time: number;
}

const pushToSheet = async (payload: SheetPayload): Promise<boolean> => {
  const body = {
    group: payload.group,
    student_full_name: payload.student_full_name,
    problem_url: payload.problem_url,
    github_link: payload.github_link,
    attempts: String(payload.attempts),
    time: String(payload.time),
  };
  console.log('A2SV submit (sent JSON):', JSON.stringify(body, null, 2));
  console.log('A2SV submit (calling Apps Script):', config.sheet.url);
  try {
    const response = await fetch(config.sheet.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    console.log('A2SV submit (Apps Script response):', response.status, response.statusText, text);
    if (response.ok) return true;
    return false;
  } catch (err) {
    console.error('A2SV submit (Apps Script failed):', err);
    throw err;
  }
};

export default { pushToSheet };
