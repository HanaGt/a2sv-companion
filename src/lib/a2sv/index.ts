import config from '../../config';

const pushToSheet = async (
  studentName: string,
  problemName: string,
  timeTaken: number
) => {
  const response = await fetch(config.api.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentName,
      problemName,
      timeTaken,
    }),
  });

  if (response.status == 200) return true;
  return false;
};

export default { pushToSheet };
